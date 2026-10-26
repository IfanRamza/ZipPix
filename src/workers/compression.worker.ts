import {
  getEditedSize,
  getOutputSize,
  hasColorAdjustments,
  hasGeometryEdits,
  renderEdited,
} from '@/lib/editPipeline';
import { getMimeType, isLossless } from '@/lib/formats';
import { reducePalette } from '@/lib/palette';
import { shouldReuseSource } from '@/lib/sourceReuse';
import { encodeToTarget } from '@/lib/targetSize';
import type { AvifEffort, TargetSizeResult } from '@/types';
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

/** libavif speed per effort: each step down is ~3x slower for ~10% smaller files */
const AVIF_SPEED: Record<AvifEffort, number> = { balanced: 7, high: 5, max: 3 };

// Chroma settings measured on fine red/blue detail; the codecs' numbering isn't intuitive
/** MozJPEG: 1 = no chroma subsampling (4:4:4), applied only with auto_subsample off */
const JPEG_FULL_CHROMA = { auto_subsample: false, chroma_subsample: 1 };
/** libavif: 3 = YUV 4:4:4 (1 is the 4:2:0 default, 0 is greyscale) */
const AVIF_SUBSAMPLE_444 = 3;

type Settings = CompressionRequest['settings'];

async function mozJpeg(pixels: ImageData, quality: number, s: Settings): Promise<ArrayBuffer> {
  const { default: encodeJpeg } = await import('@jsquash/jpeg/encode');
  return encodeJpeg(pixels, { quality, ...(s.fullChroma && JPEG_FULL_CHROMA) });
}

async function oxiPng(pixels: ImageData): Promise<ArrayBuffer> {
  const { default: optimise } = await import('@jsquash/oxipng/optimise');
  const level = pixels.width * pixels.height <= OXIPNG_LEVEL_2_MAX_PIXELS ? 2 : 1;
  return optimise(pixels, { level });
}

async function losslessWebp(pixels: ImageData): Promise<ArrayBuffer> {
  const { default: encodeWebp } = await import('@jsquash/webp/encode');
  return encodeWebp(pixels, { lossless: 1 });
}

/** Codecs whose WASM failed to load (offline before first use, blocked fetch) */
const unavailable = new Set<string>();

/**
 * MozJPEG and OxiPNG beat the browser's encoders, so their WASM is fetched on
 * first use; if that fails, the canvas encoder takes over for the session.
 * Canvas can't write lossless WebP at all, so that one is retried every time.
 */
async function encodeWasm(
  name: string,
  type: string,
  run: () => Promise<ArrayBuffer>,
  hasFallback = true,
): Promise<Blob | null> {
  if (unavailable.has(name)) return null;
  try {
    return new Blob([await run()], { type });
  } catch (error) {
    console.warn(`${name} WASM encoder unavailable`, error);
    if (hasFallback) unavailable.add(name);
    return null;
  }
}

async function encode(
  canvas: OffscreenCanvas,
  pixels: () => ImageData,
  settings: Settings,
  quality: number,
): Promise<Blob> {
  const { format } = settings;
  const type = getMimeType(format);
  let wasm: Blob | null = null;
  if (format === 'jpeg') {
    wasm = await encodeWasm('MozJPEG', type, () => mozJpeg(pixels(), quality, settings));
  } else if (format === 'png') {
    wasm = await encodeWasm('OxiPNG', type, () => oxiPng(pixels()));
  } else if (isLossless(settings)) {
    wasm = await encodeWasm('WebP lossless', type, () => losslessWebp(pixels()), false);
    // A lossy file would silently break the promise, so fail visibly instead
    if (!wasm) throw new Error('The lossless WebP encoder could not load. Check your connection.');
  }
  if (wasm) return wasm;

  // Native AVIF (Safari) takes no options, so effort and 4:4:4 need the WASM encoder
  const avifOptions = !!settings.avifEffort || !!settings.fullChroma;
  if (format === 'avif' && (avifOptions || !(await canvasEncodesAvif()))) {
    // WASM encoder (~3 MB) is only fetched the first time AVIF is actually needed
    const { default: encodeAvif } = await import('@jsquash/avif/encode');
    const buffer = await encodeAvif(pixels(), {
      quality,
      speed: AVIF_SPEED[settings.avifEffort ?? 'balanced'],
      ...(settings.fullChroma && { subsample: AVIF_SUBSAMPLE_444 }),
    });
    return new Blob([buffer], { type });
  }

  return canvas.convertToBlob({
    type,
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
    const paletteColors = settings.format === 'png' ? settings.paletteColors : undefined;
    if (paletteColors) {
      imageData = await reducePalette(ctx.getImageData(0, 0, out.width, out.height), paletteColors);
      // The canvas fallback encoder must see the reduced pixels too
      ctx.putImageData(imageData, 0, 0);
    }
    const pixels = () => (imageData ??= ctx.getImageData(0, 0, out.width, out.height));
    const encodeAt = (q: number) => encode(canvas, pixels, settings, q);

    // Lossless output has no quality to trade for size
    const targetSize = isLossless(settings) ? undefined : settings.targetSize;
    let blob: Blob;
    let target: TargetSizeResult | undefined;
    if (targetSize) {
      const { blob: fitted, ...result } = await encodeToTarget(encodeAt, targetSize);
      blob = fitted;
      target = result;
    } else {
      blob = await encodeAt(settings.quality);
    }

    // Background removal is already baked into `source`, so only these steps change pixels
    const pixelsUnchanged =
      !paletteColors &&
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
