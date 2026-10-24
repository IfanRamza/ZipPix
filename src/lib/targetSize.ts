import type { TargetSizeResult } from '@/types';

/** Above this, lossy encoders grow the file a lot for no visible gain */
export const MAX_TARGET_QUALITY = 95;
export const MIN_QUALITY = 1;

/**
 * First guess for how fast size falls with quality: across MozJPEG, WebP and
 * AVIF, file size roughly halves every ~12 quality steps below the top.
 */
const QUALITY_PER_HALVING = 12;

/**
 * Find the highest quality whose output fits in `targetBytes`.
 *
 * File size grows roughly exponentially with quality, so the next guess is
 * interpolated in log-size between the closest qualities known to fit and to
 * overshoot. On measured MozJPEG/WebP/AVIF curves that averages ~5.5 encodes
 * instead of bisection's ~7.6 (AVIF: 4.6), which matters for slow encoders.
 * When interpolation stalls on one side, a bisection step takes over; the
 * worst case is one encode more than bisection.
 *
 * If nothing fits, the smallest result is returned with `targetMet: false`
 * so the UI can explain why.
 */
export async function encodeToTarget(
  encodeAt: (quality: number) => Promise<Blob>,
  targetBytes: number,
): Promise<{ blob: Blob } & TargetSizeResult> {
  const top = await encodeAt(MAX_TARGET_QUALITY);
  if (top.size <= targetBytes) return { blob: top, quality: MAX_TARGET_QUALITY, targetMet: true };

  // Invariant: `over` is too large; `fit` (when set) fits; the answer lies in [fit, over)
  let over = { quality: MAX_TARGET_QUALITY, blob: top };
  let fit: { quality: number; blob: Blob } | null = null;
  let smallest = over;
  let lastSide: 'fit' | 'over' | null = null;
  let sameSideRun = 0;

  for (;;) {
    const lo = fit?.quality ?? MIN_QUALITY - 1;
    if (over.quality - lo <= 1) break;

    let guess: number;
    if (sameSideRun >= 2) {
      guess = (lo + over.quality) / 2;
    } else if (fit) {
      const t = Math.log(targetBytes / fit.blob.size) / Math.log(over.blob.size / fit.blob.size);
      guess = lo + t * (over.quality - lo);
    } else {
      guess = over.quality - QUALITY_PER_HALVING * Math.log2(over.blob.size / targetBytes);
    }
    // Always make progress inside the bracket
    const quality = Math.min(over.quality - 1, Math.max(lo + 1, Math.round(guess)));

    const blob = await encodeAt(quality);
    const side = blob.size <= targetBytes ? 'fit' : 'over';
    if (side === 'fit') {
      fit = { quality, blob };
    } else {
      over = { quality, blob };
      if (blob.size < smallest.blob.size) smallest = over;
    }
    sameSideRun = side === lastSide ? sameSideRun + 1 : 1;
    lastSide = side;
  }

  return fit ? { ...fit, targetMet: true } : { ...smallest, targetMet: false };
}
