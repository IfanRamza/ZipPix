import type { TargetSizeResult } from '@/types';

/** Above this, lossy encoders grow the file a lot for no visible gain */
export const MAX_TARGET_QUALITY = 95;
export const MIN_QUALITY = 1;

/**
 * Find the highest quality whose output fits in `targetBytes`.
 *
 * File size grows with quality, so a binary search needs ~7 encodes for the
 * 1–95 range. If nothing fits, the smallest result (quality 1) is returned
 * with `targetMet: false` so the UI can explain why.
 */
export async function encodeToTarget(
  encodeAt: (quality: number) => Promise<Blob>,
  targetBytes: number,
): Promise<{ blob: Blob } & TargetSizeResult> {
  const top = await encodeAt(MAX_TARGET_QUALITY);
  if (top.size <= targetBytes) return { blob: top, quality: MAX_TARGET_QUALITY, targetMet: true };

  let lo = MIN_QUALITY;
  let hi = MAX_TARGET_QUALITY - 1;
  let fit: { blob: Blob; quality: number } | null = null;
  let smallest = { blob: top, quality: MAX_TARGET_QUALITY };

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const blob = await encodeAt(mid);
    if (blob.size <= targetBytes) {
      fit = { blob, quality: mid };
      lo = mid + 1;
    } else {
      if (blob.size < smallest.blob.size) smallest = { blob, quality: mid };
      hi = mid - 1;
    }
  }

  return fit ? { ...fit, targetMet: true } : { ...smallest, targetMet: false };
}
