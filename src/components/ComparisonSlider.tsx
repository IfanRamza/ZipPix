import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useImageStore } from '@/store/imageStore';
import type { EditState } from '@/types';
import { ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ComparisonSliderProps {
  originalUrl: string;
  compressedUrl: string | null;
  position?: number;
  onPositionChange?: (position: number) => void;
}

// Generate preview URL from canvas with all edits applied
async function generateEditedPreview(imageUrl: string, editState: EditState): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { crop, rotation, flipHorizontal, flipVertical, brightness, contrast, saturation } =
        editState;

      // Determine source dimensions (after crop)
      const srcX = crop?.x ?? 0;
      const srcY = crop?.y ?? 0;
      const srcW = crop?.width ?? img.naturalWidth;
      const srcH = crop?.height ?? img.naturalHeight;

      // Determine if rotated 90 or 270 (dimensions swap)
      const isRotatedSideways = rotation === 90 || rotation === 270;
      const finalWidth = isRotatedSideways ? srcH : srcW;
      const finalHeight = isRotatedSideways ? srcW : srcH;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Apply transformations
      ctx.save();
      ctx.translate(finalWidth / 2, finalHeight / 2);

      // Apply rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Apply flips
      const scaleX = flipHorizontal ? -1 : 1;
      const scaleY = flipVertical ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      // Draw the cropped portion centered
      ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);

      ctx.restore();

      // Apply color filters if any
      if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
        const data = imageData.data;

        const brightnessFactor = brightness / 100;
        const contrastFactor = (contrast + 100) / 100;
        const saturationFactor = (saturation + 100) / 100;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          r += 255 * brightnessFactor;
          g += 255 * brightnessFactor;
          b += 255 * brightnessFactor;

          r = (r - 128) * contrastFactor + 128;
          g = (g - 128) * contrastFactor + 128;
          b = (b - 128) * contrastFactor + 128;

          const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
          r = gray + saturationFactor * (r - gray);
          g = gray + saturationFactor * (g - gray);
          b = gray + saturationFactor * (b - gray);

          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function hasAnyEdits(editState: EditState): boolean {
  return !!(
    editState.crop ||
    editState.rotation !== 0 ||
    editState.flipHorizontal ||
    editState.flipVertical ||
    editState.brightness !== 0 ||
    editState.contrast !== 0 ||
    editState.saturation !== 0
  );
}

export function ComparisonSlider({
  originalUrl,
  compressedUrl,
  position = 50,
  onPositionChange,
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [localPosition, setLocalPosition] = useState(position);

  // Get editState from store to apply to original preview
  const { editState } = useImageStore();
  const [editedOriginalUrl, setEditedOriginalUrl] = useState<string>(originalUrl);

  // Generate edited preview when editState or originalUrl changes
  useEffect(() => {
    let cancelled = false;

    const updatePreview = async () => {
      if (hasAnyEdits(editState)) {
        try {
          const url = await generateEditedPreview(originalUrl, editState);
          if (!cancelled) {
            setEditedOriginalUrl(url);
          }
        } catch (error) {
          console.error('Failed to generate edited preview:', error);
          if (!cancelled) {
            setEditedOriginalUrl(originalUrl);
          }
        }
      } else {
        setEditedOriginalUrl(originalUrl);
      }
    };

    updatePreview();

    return () => {
      cancelled = true;
    };
  }, [editState, originalUrl]);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setLocalPosition(percentage);
      onPositionChange?.(percentage);
    },
    [onPositionChange],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isResizing) {
        updatePosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isResizing && e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const stopResizing = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing, updatePosition]);

  // Determine label based on whether edits are applied
  const originalLabel = hasAnyEdits(editState) ? 'Edited' : 'Original';

  return (
    <Card className='border-border/50 bg-background/40 group animate-in fade-in relative touch-none overflow-hidden rounded backdrop-blur-xl duration-300 select-none'>
      <div
        ref={containerRef}
        className='relative aspect-video w-full cursor-ew-resize'
        onMouseDown={() => setIsResizing(true)}
        onTouchStart={() => setIsResizing(true)}
      >
        {/* Background: Compressed Image (Full width, always visible on right side) */}
        <div className='absolute inset-0 bg-black/20'>
          {compressedUrl ? (
            <img
              src={compressedUrl}
              alt='Compressed'
              className='pointer-events-none h-full w-full object-contain'
              draggable={false}
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center'>
              <span className='text-muted-foreground text-sm'>Compressing...</span>
            </div>
          )}
        </div>

        {/* Foreground: Original/Edited Image (Clipped by slider position) */}
        <div
          className='absolute inset-0 overflow-hidden'
          style={{ clipPath: `inset(0 ${100 - localPosition}% 0 0)` }}
        >
          <img
            src={editedOriginalUrl}
            alt={originalLabel}
            className='pointer-events-none h-full w-full object-contain'
            draggable={false}
          />
        </div>

        {/* Slider Handle */}
        <div
          className='absolute top-0 bottom-0 z-10 w-0.5 cursor-ew-resize bg-linear-to-b from-cyan-500/50 via-cyan-400 to-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
          style={{ left: `${localPosition}%` }}
        >
          <div className='bg-background absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 transition-transform hover:scale-110 active:scale-95'>
            <ArrowLeftRight className='h-5 w-5 text-cyan-400' />
          </div>
        </div>

        {/* Labels */}
        <Badge className='bg-background/80 pointer-events-none absolute top-4 left-4 z-20 rounded-sm shadow-sm backdrop-blur'>
          {originalLabel}
        </Badge>
        <Badge className='bg-background/80 pointer-events-none absolute top-4 right-4 z-20 rounded-sm shadow-sm backdrop-blur'>
          Compressed
        </Badge>
      </div>
    </Card>
  );
}
