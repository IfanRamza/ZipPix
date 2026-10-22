import { LoadingSpinner } from '@/components/LoadingSpinner';
import { hasColorAdjustments, hasGeometryEdits } from '@/lib/editPipeline';
import { renderPreview } from '@/lib/image';
import { cn } from '@/lib/utils';
import type { EditState, ImageFileState } from '@/types';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
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
  const positionRef = useRef(50);
  const [dragging, setDragging] = useState(false);
  const [ariaValue, setAriaValue] = useState(50);

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

  const positionFromPointer = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    applyPosition(((clientX - rect.left) / rect.width) * 100);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    positionFromPointer(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) positionFromPointer(e.clientX);
  };

  const onPointerUp = () => {
    setDragging(false);
    setAriaValue(Math.round(positionRef.current));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className='focus-visible:ring-ring relative h-[min(62vh,560px)] min-h-72 w-full cursor-ew-resize touch-none outline-none select-none focus-visible:ring-4 focus-visible:ring-inset'
      >
        {/* Compressed (full) */}
        {compressedUrl ? (
          <img
            src={compressedUrl}
            alt='Compressed result'
            className='pointer-events-none absolute inset-0 size-full object-contain'
            draggable={false}
            decoding='async'
          />
        ) : (
          <div className='text-muted-foreground absolute inset-0 flex items-center justify-center'>
            <LoadingSpinner size={24} />
          </div>
        )}

        {/* Original / edited (clipped) */}
        <div ref={clipRef} className='absolute inset-0' style={{ clipPath: 'inset(0 50% 0 0)' }}>
          <img
            src={originalUrl}
            alt={label}
            className='pointer-events-none size-full object-contain'
            draggable={false}
            decoding='async'
          />
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
              dragging && 'scale-110',
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
    </div>
  );
}
