import { preload, removeBackground } from '@imgly/background-removal';

export type BackgroundRemovalProgress = {
  key: string;
  current: number;
  total: number;
};

let preloadPromise: Promise<void> | null = null;

/**
 * Preload the background removal ONNX model in the background.
 * Call this early (e.g. on image upload) so the model is cached
 * before the user clicks "Remove Background".
 *
 * Safe to call multiple times — only the first call triggers a download.
 * Errors are silently swallowed since this is purely opportunistic.
 */
export function preloadBackgroundRemovalModel(): void {
  if (!preloadPromise) {
    preloadPromise = preload().catch(() => {
      // Reset so a retry is possible on next call
      preloadPromise = null;
    });
  }
}

/**
 * Remove the background from an image blob using client-side AI.
 * Returns a transparent PNG blob.
 *
 * The ONNX model (~40MB) is downloaded on first call and cached by the browser.
 */
export async function removeImageBackground(
  blob: Blob,
  onProgress?: (progress: BackgroundRemovalProgress) => void,
): Promise<Blob> {
  try {
    const result = await removeBackground(blob, {
      progress: onProgress
        ? (key: string, current: number, total: number) => {
            onProgress({ key, current, total });
          }
        : undefined,
      output: {
        format: 'image/png',
        quality: 1,
      },
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Background removal failed';
    throw new Error(`Background removal failed: ${message}`);
  }
}
