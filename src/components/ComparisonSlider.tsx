import { LoadingSpinner } from '@/components/LoadingSpinner';
import { hasColorAdjustments, hasGeometryEdits } from '@/lib/editPipeline';
import { renderPreview } from '@/lib/image';
import { cn } from '@/lib/utils';
import type { EditState, ImageFileState } from '@/types';
import { Minus, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

interface ComparisonSliderProps {
  original: ImageFileState;
  editState: EditState;
  compressedUrl: string | null;
  isCompressing?: boolean;
  isRemovingBackground?: boolean;
}

/** Renders the edited (pre-compression) original, downscaled for display */
function useEditedOriginal(original: ImageFileState, editState: EditState): string {
  const needsRender = hasGeometryEdits(editState) || hasColorAdjustments(editState);
  const [rendered, setRendered] = useState<{ key: EditState; url: string } | null>(null);
  const currentUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!needsRender) return;
    let cancelled = false;
    renderPreview(original.file, editState)
      .then(({ url }) => {
        if (cancelled) return URL.revokeObjectURL(url);
        // The previous preview stays visible until the new one is ready
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = url;
        setRendered({ key: editState, url });
      })
      .catch((error) => console.error('Failed to render edited preview', error));
    return () => {
      cancelled = true;
    };
  }, [original.file, editState, needsRender]);

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );

  if (!needsRender) return original.previewUrl;
  return rendered?.key === editState ? rendered.url : (rendered?.url ?? original.previewUrl);
}

/** Zoom is relative to "fit"; it stops at this many screen pixels per image pixel */
const MAX_PIXEL_SCALE = 8;
const ZOOM_STEP = 1.5;
/** Pointer-downs this close to the divider move it instead of panning */
const HANDLE_GRAB_PX = 24;

interface View {
  zoom: number;
  x: number;
  y: number;
}

const FIT: View = { zoom: 1, x: 0, y: 0 };

type Gesture = 'divider' | 'pan' | 'pinch';

export function ComparisonSlider({
  original,
  editState,
  compressedUrl,
  isCompressing = false,
  isRemovingBackground = false,
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const compressedLayerRef = useRef<HTMLDivElement>(null);
  const originalLayerRef = useRef<HTMLDivElement>(null);
  const compressedImgRef = useRef<HTMLImageElement>(null);
  const positionRef = useRef(50);
  const viewRef = useRef<View>(FIT);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [ariaValue, setAriaValue] = useState(50);
  /** Screen pixels per image pixel at the current zoom (null until the image loads) */
  const [pixelScale, setPixelScale] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const originalUrl = useEditedOriginal(original, editState);
  const isEdited =
    hasGeometryEdits(editState) || hasColorAdjustments(editState) || editState.removeBackground;

  // Position updates bypass React entirely — no re-render while dragging
  const applyPosition = useCallback((pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    positionRef.current = clamped;
    if (clipRef.current) clipRef.current.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
    if (handleRef.current) handleRef.current.style.left = `${clamped}%`;
  }, []);

  /** Screen pixels per image pixel when the compressed image is fitted */
  const fitScale = useCallback(() => {
    const img = compressedImgRef.current;
    const box = containerRef.current;
    if (!img?.naturalWidth || !box) return null;
    return Math.min(box.clientWidth / img.naturalWidth, box.clientHeight / img.naturalHeight);
  }, []);

  // Both layers get the same transform, so the two images stay aligned under the divider
  const applyView = useCallback(
    (next: View) => {
      const box = containerRef.current;
      if (!box) return;
      const fit = fitScale();
      const maxZoom = fit ? Math.max(1, MAX_PIXEL_SCALE / fit) : 1;
      const zoom = Math.max(1, Math.min(maxZoom, next.zoom));
      // Keep the zoomed layer covering the viewport
      const x = Math.min(0, Math.max(box.clientWidth * (1 - zoom), next.x));
      const y = Math.min(0, Math.max(box.clientHeight * (1 - zoom), next.y));
      viewRef.current = { zoom, x, y };

      const transform = zoom === 1 ? '' : `translate(${x}px, ${y}px) scale(${zoom})`;
      // Past 1:1, show real pixels so compression artefacts are visible
      const rendering = fit && zoom * fit > 1 ? 'pixelated' : '';
      for (const layer of [compressedLayerRef.current, originalLayerRef.current]) {
        if (!layer) continue;
        layer.style.transform = transform;
        layer.style.imageRendering = rendering;
      }
      setZoomed(zoom > 1);
      setPixelScale(fit ? zoom * fit : null);
    },
    [fitScale],
  );

  /** Zoom by `factor`, keeping the container point (px, py) still (default: centre) */
  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) => {
      const box = containerRef.current;
      if (!box) return;
      const { zoom, x, y } = viewRef.current;
      const cx = px ?? box.clientWidth / 2;
      const cy = py ?? box.clientHeight / 2;
      const next = zoom * factor;
      applyView({ zoom: next, x: cx - (cx - x) * (next / zoom), y: cy - (cy - y) * (next / zoom) });
    },
    [applyView],
  );

  const resetView = useCallback(() => applyView(FIT), [applyView]);

  /** Fit ↔ 100% (one image pixel per screen pixel) */
  const toggleActualSize = (px?: number, py?: number) => {
    const fit = fitScale();
    if (!fit) return;
    if (viewRef.current.zoom > 1 || fit >= 1) return resetView();
    zoomAt(1 / fit, px, py);
  };

  const localPoint = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top, width: rect.width };
  };

  const positionFromPointer = (clientX: number) => {
    const { x, width } = localPoint(clientX, 0);
    applyPosition((x / width) * 100);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pointers = pointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) return setGesture('pinch');
    if (pointers.size > 2) return;

    const { x, width } = localPoint(e.clientX, e.clientY);
    const nearHandle = Math.abs(x - (positionRef.current / 100) * width) <= HANDLE_GRAB_PX;
    if (viewRef.current.zoom > 1 && !nearHandle) {
      setGesture('pan');
    } else {
      setGesture('divider');
      positionFromPointer(e.clientX);
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    const prev = pointers.get(e.pointerId);
    if (!prev || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture === 'pinch') {
      const other = [...pointers].find(([id]) => id !== e.pointerId)?.[1];
      if (!other) return;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const mid = localPoint((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
      if (before > 0) zoomAt(after / before, mid.x, mid.y);
      // The midpoint moves by half of this finger's movement
      const { zoom, x, y } = viewRef.current;
      applyView({ zoom, x: x + (e.clientX - prev.x) / 2, y: y + (e.clientY - prev.y) / 2 });
    } else if (gesture === 'pan') {
      const { zoom, x, y } = viewRef.current;
      applyView({ zoom, x: x + e.clientX - prev.x, y: y + e.clientY - prev.y });
    } else {
      positionFromPointer(e.clientX);
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.delete(e.pointerId);
    // Lifting one finger of a pinch ends the gesture without moving the divider
    if (pointers.size > 0) return setGesture(null);
    if (gesture === 'divider') setAriaValue(Math.round(positionRef.current));
    setGesture(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const zoomKeys: Record<string, () => void> = {
      '+': () => zoomAt(ZOOM_STEP),
      '=': () => zoomAt(ZOOM_STEP),
      '-': () => zoomAt(1 / ZOOM_STEP),
      '0': resetView,
    };
    if (zoomKeys[e.key]) {
      e.preventDefault();
      return zoomKeys[e.key]();
    }

    const step = e.shiftKey ? 10 : 2;
    const next =
      e.key === 'ArrowLeft'
        ? positionRef.current - step
        : e.key === 'ArrowRight'
          ? positionRef.current + step
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null;
    if (next === null) return;
    e.preventDefault();
    applyPosition(next);
    setAriaValue(Math.round(positionRef.current));
  };

  useEffect(() => applyPosition(positionRef.current), [applyPosition]);

  // Ctrl/⌘ + wheel (also how browsers report a trackpad pinch) zooms; once zoomed,
  // plain scrolling pans. React's wheel listener is passive, so attach our own.
  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      const { zoom, x, y } = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = box.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
      } else if (zoom > 1) {
        e.preventDefault();
        applyView({ zoom, x: x - e.deltaX, y: y - e.deltaY });
      }
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [zoomAt, applyView]);

  // A new image starts fitted; new settings for the same image keep the zoom for comparison
  useEffect(() => resetView(), [original.id, resetView]);

  // The fitted size depends on the viewport
  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => applyView(viewRef.current));
    observer.observe(box);
    return () => observer.disconnect();
  }, [applyView]);

  const label = isEdited ? 'Edited' : 'Original';

  return (
    <div className='bg-checker shadow-card relative overflow-hidden rounded-3xl'>
      <div
        ref={containerRef}
        role='slider'
        tabIndex={0}
        aria-label='Compare original and compressed'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaValue}
        aria-valuetext={`${ariaValue}% ${label.toLowerCase()}`}
        aria-keyshortcuts='+ - 0'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          const { x, y } = localPoint(e.clientX, e.clientY);
          toggleActualSize(x, y);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'focus-visible:ring-ring relative h-[min(62vh,560px)] min-h-72 w-full touch-none overflow-hidden outline-none select-none focus-visible:ring-4 focus-visible:ring-inset',
          !zoomed ? 'cursor-ew-resize' : gesture === 'pan' ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        {/* Compressed (full) */}
        {compressedUrl ? (
          <div ref={compressedLayerRef} className='absolute inset-0 origin-top-left'>
            <img
              ref={compressedImgRef}
              src={compressedUrl}
              alt='Compressed result'
              className='pointer-events-none size-full object-contain'
              draggable={false}
              decoding='async'
              onLoad={() => applyView(viewRef.current)}
            />
          </div>
        ) : (
          <div className='text-muted-foreground absolute inset-0 flex items-center justify-center'>
            <LoadingSpinner size={24} />
          </div>
        )}

        {/* Original / edited: clipped in screen space, zoomed inside */}
        <div ref={clipRef} className='absolute inset-0' style={{ clipPath: 'inset(0 50% 0 0)' }}>
          <div ref={originalLayerRef} className='size-full origin-top-left'>
            <img
              src={originalUrl}
              alt={label}
              className='pointer-events-none size-full object-contain'
              draggable={false}
              decoding='async'
            />
          </div>
        </div>

        {/* Handle */}
        <div
          ref={handleRef}
          className='pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgb(0_0_0/0.35)]'
          style={{ left: '50%' }}
        >
          <div
            className={cn(
              'absolute top-1/2 left-1/2 flex size-9 -translate-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur transition-transform duration-200',
              gesture === 'divider' && 'scale-110',
            )}
          >
            <svg viewBox='0 0 24 24' className='size-4' fill='currentColor' aria-hidden>
              <path d='M9 6l-6 6 6 6V6zm6 0v12l6-6-6-6z' />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <span className='pointer-events-none absolute top-3 left-3 z-20 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-md'>
          {label}
        </span>
        <span className='pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-md'>
          {isCompressing && <LoadingSpinner size={12} />}
          Compressed
        </span>

        {isRemovingBackground && (
          <div className='absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/50 text-white backdrop-blur-md'>
            <LoadingSpinner size={28} />
            <span className='text-[15px] font-medium'>Removing background…</span>
            <span className='text-[12px] text-white/70'>First run downloads the AI model</span>
          </div>
        )}
      </div>

      {/* Outside the slider, so the buttons aren't nested interactive content */}
      {compressedUrl && (
        <div className='absolute right-3 bottom-3 z-20 flex items-center rounded-full bg-black/55 text-white backdrop-blur-md'>
          <ZoomButton label='Zoom out' disabled={!zoomed} onClick={() => zoomAt(1 / ZOOM_STEP)}>
            <Minus className='size-4' />
          </ZoomButton>
          <button
            type='button'
            onClick={() => toggleActualSize()}
            title={zoomed ? 'Fit to view' : 'Actual size'}
            className='tabular focus-visible:ring-ring min-w-14 rounded-full px-1 py-1.5 text-[12px] font-medium outline-none focus-visible:ring-2'
          >
            {zoomed && pixelScale ? `${Math.round(pixelScale * 100)}%` : 'Fit'}
          </button>
          <ZoomButton label='Zoom in' onClick={() => zoomAt(ZOOM_STEP)}>
            <Plus className='size-4' />
          </ZoomButton>
        </div>
      )}
    </div>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className='focus-visible:ring-ring flex size-8 items-center justify-center rounded-full outline-none hover:bg-white/15 focus-visible:ring-2 disabled:opacity-40 disabled:hover:bg-transparent'
    >
      {children}
    </button>
  );
}
