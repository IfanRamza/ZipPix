/**
 * Shared, framework-free image pipeline used by the compression worker
 * and the on-screen previews, so what you see is exactly what you export.
 *
 * Colour adjustments use CSS filter semantics (brightness/contrast/saturate).
 * That lets the editor preview them instantly with a CSS `filter` on an <img>,
 * while the canvas uses the GPU-backed `ctx.filter` when available.
 */
import type { CompressionSettings, EditState, ImageDimensions } from '@/types';

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function hasColorAdjustments(edit: EditState): boolean {
  return edit.brightness !== 0 || edit.contrast !== 0 || edit.saturation !== 0;
}

export function hasGeometryEdits(edit: EditState): boolean {
  return !!edit.crop || edit.rotation !== 0 || edit.flipHorizontal || edit.flipVertical;
}

export function hasEdits(edit: EditState): boolean {
  return hasGeometryEdits(edit) || hasColorAdjustments(edit) || edit.removeBackground;
}

/** CSS filter string for the colour adjustments (-100..100 → 0..2) */
export function buildCssFilter(edit: EditState): string {
  if (!hasColorAdjustments(edit)) return 'none';
  const b = 1 + edit.brightness / 100;
  const c = 1 + edit.contrast / 100;
  const s = 1 + edit.saturation / 100;
  return `brightness(${b}) contrast(${c}) saturate(${s})`;
}

/** Size of the image after crop + rotation (before any resize) */
export function getEditedSize(source: ImageDimensions, edit?: EditState): ImageDimensions {
  const w = edit?.crop?.width ?? source.width;
  const h = edit?.crop?.height ?? source.height;
  const sideways = edit?.rotation === 90 || edit?.rotation === 270;
  return sideways ? { width: h, height: w } : { width: w, height: h };
}

/** Final output size for a given edited size and compression settings */
export function getOutputSize(
  edited: ImageDimensions,
  settings: Pick<CompressionSettings, 'scale' | 'width' | 'height' | 'maintainAspectRatio'>,
): ImageDimensions {
  const { width, height, maintainAspectRatio } = settings;
  const aspect = edited.width / edited.height;

  if (width || height) {
    if (!maintainAspectRatio && width && height) {
      return { width, height };
    }
    if (width && height) {
      // Fit inside the requested box without distortion
      const fitW = Math.min(width, Math.round(height * aspect));
      return { width: Math.max(1, fitW), height: Math.max(1, Math.round(fitW / aspect)) };
    }
    if (width) return { width, height: Math.max(1, Math.round(width / aspect)) };
    return { width: Math.max(1, Math.round(height! * aspect)), height: height! };
  }

  const factor = (settings.scale || 100) / 100;
  return {
    width: Math.max(1, Math.round(edited.width * factor)),
    height: Math.max(1, Math.round(edited.height * factor)),
  };
}

let ctxFilterSupported: boolean | null = null;

function supportsCtxFilter(ctx: Ctx2D): boolean {
  if (ctxFilterSupported === null) {
    const previous = ctx.filter;
    ctx.filter = 'brightness(1.5)';
    ctxFilterSupported = ctx.filter === 'brightness(1.5)';
    ctx.filter = previous ?? 'none';
  }
  return ctxFilterSupported;
}

/**
 * Intermediate sizes for shrinking `from` towards `to`, halving each axis
 * while it stays at least as large as the target. The last step is within 2x.
 */
export function halvingSteps(from: ImageDimensions, to: ImageDimensions): ImageDimensions[] {
  const steps: ImageDimensions[] = [];
  let { width, height } = from;
  for (;;) {
    const w = width / 2 >= to.width ? Math.round(width / 2) : width;
    const h = height / 2 >= to.height ? Math.round(height / 2) : height;
    if (w === width && h === height) return steps;
    steps.push({ width: w, height: h });
    width = w;
    height = h;
  }
}

type Drawable = CanvasImageSource & { width: number; height: number };

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  return Object.assign(document.createElement('canvas'), { width, height });
}

/**
 * Firefox samples nearest-neighbour when one drawImage shrinks by more than
 * ~2x, so 25% resizes come out jagged with moiré. Halving in steps first gives
 * every browser a clean, box-filtered result (Chrome's output is unchanged).
 */
function prescale(
  source: Drawable,
  rect: { x: number; y: number; width: number; height: number },
  target: ImageDimensions,
): { source: Drawable; x: number; y: number; width: number; height: number } {
  const steps = halvingSteps(rect, target);
  if (!steps.length) return { source, ...rect };

  let current: Drawable = source;
  let from = rect;
  for (const step of steps) {
    const canvas = createCanvas(step.width, step.height);
    const ctx = canvas.getContext('2d') as Ctx2D | null;
    if (!ctx) return { source, ...rect };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, from.x, from.y, from.width, from.height, 0, 0, step.width, step.height);
    current = canvas;
    from = { x: 0, y: 0, ...step };
  }
  return { source: current, ...from };
}

/**
 * Draw `source` into `ctx` (sized outW×outH) applying crop, rotation, flips,
 * resize and colour adjustments in a single pass.
 */
export function renderEdited(
  ctx: Ctx2D,
  original: Drawable,
  edit: EditState | undefined,
  out: ImageDimensions,
  options: { background?: string } = {},
): void {
  const crop = {
    x: edit?.crop?.x ?? 0,
    y: edit?.crop?.y ?? 0,
    width: edit?.crop?.width ?? original.width,
    height: edit?.crop?.height ?? original.height,
  };
  const edited = getEditedSize({ width: original.width, height: original.height }, edit);
  // Target size in the source's orientation (a 90° turn swaps the axes)
  const sideways = edit?.rotation === 90 || edit?.rotation === 270;
  const src = prescale(original, crop, sideways ? { width: out.height, height: out.width } : out);

  ctx.save();
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, out.width, out.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const useCtxFilter = !!edit && hasColorAdjustments(edit) && supportsCtxFilter(ctx);
  if (useCtxFilter) ctx.filter = buildCssFilter(edit!);

  ctx.translate(out.width / 2, out.height / 2);
  ctx.scale(out.width / edited.width, out.height / edited.height);
  if (edit?.rotation) ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.scale(edit?.flipHorizontal ? -1 : 1, edit?.flipVertical ? -1 : 1);
  // The transform works in crop pixels, so a prescaled source still fills the crop's box
  const { width: w, height: h } = crop;
  ctx.drawImage(src.source, src.x, src.y, src.width, src.height, -w / 2, -h / 2, w, h);
  ctx.restore();

  if (edit && hasColorAdjustments(edit) && !useCtxFilter) {
    applyCssFilterPixels(ctx, out, edit);
  }
}

/** Pixel fallback matching the CSS filter spec, for browsers without ctx.filter */
function applyCssFilterPixels(ctx: Ctx2D, size: ImageDimensions, edit: EditState): void {
  const image = ctx.getImageData(0, 0, size.width, size.height);
  const d = image.data;
  const b = 1 + edit.brightness / 100;
  const c = 1 + edit.contrast / 100;
  const s = 1 + edit.saturation / 100;
  const offset = 128 * (1 - c);

  // Saturate matrix (Filter Effects spec)
  const m0 = 0.213 + 0.787 * s,
    m1 = 0.715 - 0.715 * s,
    m2 = 0.072 - 0.072 * s;
  const m3 = 0.213 - 0.213 * s,
    m4 = 0.715 + 0.285 * s,
    m5 = 0.072 - 0.072 * s;
  const m6 = 0.213 - 0.213 * s,
    m7 = 0.715 - 0.715 * s,
    m8 = 0.072 + 0.928 * s;

  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

  for (let i = 0; i < d.length; i += 4) {
    const r = clamp(clamp(d[i] * b) * c + offset);
    const g = clamp(clamp(d[i + 1] * b) * c + offset);
    const bl = clamp(clamp(d[i + 2] * b) * c + offset);
    d[i] = clamp(m0 * r + m1 * g + m2 * bl);
    d[i + 1] = clamp(m3 * r + m4 * g + m5 * bl);
    d[i + 2] = clamp(m6 * r + m7 * g + m8 * bl);
  }
  ctx.putImageData(image, 0, 0);
}
