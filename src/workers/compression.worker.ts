import {
  getEditedSize,
  getOutputSize,
  hasColorAdjustments,
  hasGeometryEdits,
  renderEdited,
} from '@/lib/editPipeline';
import { getMimeType } from '@/lib/formats';
import { shouldReuseSource } from '@/lib/sourceReuse';
import { encodeToTarget } from '@/lib/targetSize';
import type { SupportedFormat, TargetSizeResult } from '@/types';
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

/**
 * OxiPNG level 2 takes ~2x as long as level 1 for ~7% smaller files: worth it
 * for screenshots and graphics, but a 12 MP photo would take ~25 s instead of ~12 s.
 */
const OXIPNG_LEVEL_2_MAX_PIXELS = 4_000_000;

async function mozJpeg(pixels: ImageData, quality: number): Promise<ArrayBuffer> {
  const { default: encodeJpeg } = await import('@jsquash/jpeg/encode');
  return encodeJpeg(pixels, { quality });
}

async function oxiPng(pixels: ImageData): Promise<ArrayBuffer> {
  const { default: optimise } = await import('@jsquash/oxipng/optimise');
  const level = pixels.width * pixels.height <= OXIPNG_LEVEL_2_MAX_PIXELS ? 2 : 1;
  return optimise(pixels, { level });
}

/** Codecs whose WASM failed to load (offline before first use, blocked fetch) */
const unavailable = new Set<SupportedFormat>();

/**
 * MozJPEG and OxiPNG produce much smaller files than the browser's encoders.
 * Their WASM is fetched on first use; if that fails, the canvas encoder still works.
 */
async function encodeWasm(
  format: 'jpeg' | 'png',
  pixels: ImageData,
  quality: number,
): Promise<Blob | null> {
  if (unavailable.has(format)) return null;
  try {
    const buffer = format === 'jpeg' ? await mozJpeg(pixels, quality) : await oxiPng(pixels);
    return new Blob([buffer], { type: getMimeType(format) });
  } catch (error) {
    console.warn(`${format} WASM encoder unavailable, using the browser encoder`, error);
    unavailable.add(format);
    return null;
  }
}

async function encode(
  canvas: OffscreenCanvas,
  pixels: () => ImageData,
  format: SupportedFormat,
  quality: number,
): Promise<Blob> {
  if (format === 'jpeg' || format === 'png') {
    const blob = await encodeWasm(format, pixels(), quality);
    if (blob) return blob;
  }

  if (format === 'avif' && !(await canvasEncodesAvif())) {
    // WASM encoder (~3 MB) is only fetched the first time AVIF is actually needed
    const { default: encodeAvif } = await import('@jsquash/avif/encode');
    const buffer = await encodeAvif(pixels(), { quality, speed: 7 });
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

    // Read the pixels once, however many encodes target-size mode needs
    let imageData: ImageData | null = null;
    const pixels = () => (imageData ??= ctx.getImageData(0, 0, out.width, out.height));
    const encodeAt = (q: number) => encode(canvas, pixels, settings.format, q);

    // PNG is lossless, so there is no quality to trade for size
    const targetSize = settings.format !== 'png' ? settings.targetSize : undefined;
    let blob: Blob;
    let target: TargetSizeResult | undefined;
    if (targetSize) {
      const { blob: fitted, ...result } = await encodeToTarget(encodeAt, targetSize);
      blob = fitted;
      target = result;
    } else {
      blob = await encodeAt(settings.quality);
    }

    // Background removal is already baked into `source`, so only these edits change pixels
    const pixelsUnchanged =
      !(editState && (hasGeometryEdits(editState) || hasColorAdjustments(editState))) &&
      out.width === bitmap.width &&
      out.height === bitmap.height;
    const reusedSource = await shouldReuseSource(source, blob, pixelsUnchanged);
    if (reusedSource) {
      blob = source;
      if (target && targetSize) target = { ...target, targetMet: source.size <= targetSize };
    }

    return { blob, dimensions: out, target, reusedSource };
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
