import { getEditedSize, getOutputSize, renderEdited } from '@/lib/editPipeline';
import { getMimeType } from '@/lib/formats';
import type { SupportedFormat } from '@/types';
import type { CompressionRequest, CompressionResponse } from './protocol';

let nativeAvif: Promise<boolean> | null = null;

/** Canvas silently returns PNG when it can't encode AVIF (e.g. Chrome, Firefox) */
function canvasEncodesAvif(): Promise<boolean> {
  nativeAvif ??= new OffscreenCanvas(1, 1)
    .convertToBlob({ type: 'image/avif' })
    .then((b) => b.type === 'image/avif')
    .catch(() => false);
  return nativeAvif;
}

async function encode(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  format: SupportedFormat,
  quality: number,
): Promise<Blob> {
  if (format === 'avif' && !(await canvasEncodesAvif())) {
    // WASM encoder (~3 MB) is only fetched the first time AVIF is actually needed
    const { default: encodeAvif } = await import('@jsquash/avif/encode');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const buffer = await encodeAvif(pixels, { quality, speed: 7 });
    return new Blob([buffer], { type: 'image/avif' });
  }

  return canvas.convertToBlob({
    type: getMimeType(format),
    quality: format === 'png' ? undefined : quality / 100,
  });
}

// Single-entry decode cache: re-encoding at a new quality skips the decode step
let cached: { key: string; bitmap: ImageBitmap } | null = null;

async function getBitmap(source: Blob, cacheKey?: string): Promise<ImageBitmap> {
  if (cacheKey && cached?.key === cacheKey) return cached.bitmap;

  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  if (cacheKey) {
    cached?.bitmap.close();
    cached = { key: cacheKey, bitmap };
  }
  return bitmap;
}

async function processImage({ source, cacheKey, settings, editState }: CompressionRequest) {
  const bitmap = await getBitmap(source, cacheKey);

  try {
    const edited = getEditedSize(bitmap, editState);
    const out = getOutputSize(edited, settings);

    const canvas = new OffscreenCanvas(out.width, out.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // JPEG has no alpha: flatten onto white instead of the default black
    renderEdited(ctx, bitmap, editState, out, {
      background: settings.format === 'jpeg' ? '#ffffff' : undefined,
    });

    const blob = await encode(canvas, ctx, settings.format, settings.quality);
    return { blob, dimensions: out };
  } finally {
    if (!cacheKey) bitmap.close();
  }
}

self.onmessage = async (event: MessageEvent<CompressionRequest>) => {
  const request = event.data;
  if (request.type !== 'COMPRESS') return;

  try {
    const result = await processImage(request);
    self.postMessage({
      type: 'SUCCESS',
      id: request.id,
      ...result,
    } satisfies CompressionResponse);
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      id: request.id,
      error: error instanceof Error ? error.message : 'Compression failed',
    } satisfies CompressionResponse);
  }
};
