// The @imgly/background-removal runtime (ONNX + WASM) is large, so it is only
// imported when the user actually asks for background removal.
type ImglyModule = typeof import('@imgly/background-removal');

let modulePromise: Promise<ImglyModule> | null = null;
let preloadPromise: Promise<void> | null = null;

function loadModule(): Promise<ImglyModule> {
  if (!modulePromise) {
    modulePromise = import('@imgly/background-removal').catch((error) => {
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}

/**
 * Warm up the background removal model (~40MB, cached by the browser).
 * Call this on a strong intent signal (e.g. opening the editor), not on every upload.
 *
 * Safe to call multiple times — only the first call triggers a download.
 * Errors are swallowed since this is purely opportunistic.
 */
export function preloadBackgroundRemovalModel(): void {
  if (!preloadPromise) {
    preloadPromise = loadModule()
      .then((m) => m.preload())
      .catch(() => {
        // Reset so a retry is possible on next call
        preloadPromise = null;
      });
  }
}

// Results are cached per source blob so changing quality/format doesn't re-run the model
const resultCache = new WeakMap<Blob, Promise<Blob>>();

/**
 * Remove the background from an image blob using client-side AI.
 * Returns a transparent PNG blob.
 */
export function removeImageBackground(blob: Blob): Promise<Blob> {
  const cached = resultCache.get(blob);
  if (cached) return cached;

  const result = loadModule()
    .then((m) => m.removeBackground(blob, { output: { format: 'image/png', quality: 1 } }))
    .catch((error) => {
      resultCache.delete(blob);
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new Error(`Background removal failed: ${message}`);
    });

  resultCache.set(blob, result);
  return result;
}
