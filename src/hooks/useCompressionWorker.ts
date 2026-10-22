import { removeImageBackground } from '@/lib/backgroundRemover';
import { useImageStore } from '@/store/imageStore';
import type { CompressionSettings, EditState, ImageFileState } from '@/types';
import {
  createCompressionWorker,
  type CompressionRequest,
  type CompressionResponse,
} from '@/workers';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Drives the single-image compression worker.
 *
 * - Only the latest request's result is applied; stale results are dropped.
 * - While the worker is busy, newer requests replace each other so we never
 *   queue up work for slider positions the user has already moved past.
 * - Background removal runs on the main thread (ONNX/WASM requirement) and is
 *   cached per image, so tweaking quality doesn't re-run the model.
 */
export function useCompressionWorker() {
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const latestIdRef = useRef(0);
  const pendingRef = useRef<CompressionRequest | null>(null);

  const dispatch = useCallback((request: CompressionRequest) => {
    if (busyRef.current) {
      pendingRef.current = request;
      return;
    }
    busyRef.current = true;
    workerRef.current?.postMessage(request);
  }, []);

  useEffect(() => {
    const worker = createCompressionWorker();
    workerRef.current = worker;
    const { setCompressedImage, setError } = useImageStore.getState();

    worker.onmessage = (event: MessageEvent<CompressionResponse>) => {
      busyRef.current = false;
      const response = event.data;

      const next = pendingRef.current;
      pendingRef.current = null;
      if (next) dispatch(next);

      if (Number(response.id) !== latestIdRef.current) return; // stale
      if (response.type === 'SUCCESS') {
        setCompressedImage(response.blob, response.dimensions);
      } else {
        setError(response.error);
      }
    };

    worker.onerror = (error) => {
      busyRef.current = false;
      setError(`Worker error: ${error.message}`);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      busyRef.current = false;
      pendingRef.current = null;
    };
  }, [dispatch]);

  const compress = useCallback(
    async (image: ImageFileState, settings: CompressionSettings, editState: EditState) => {
      const { setError, setProcessing, setRemovingBackground } = useImageStore.getState();
      const id = ++latestIdRef.current;
      setProcessing(true);
      setRemovingBackground(editState.removeBackground);

      try {
        let source: Blob = image.file;
        let cacheKey = image.id;

        if (editState.removeBackground) {
          source = await removeImageBackground(image.file);
          cacheKey = `${image.id}:no-bg`;
          if (id !== latestIdRef.current) return;
          setRemovingBackground(false);
        }

        dispatch({
          type: 'COMPRESS',
          id: String(id),
          source,
          cacheKey,
          settings,
          // Background removal has already been applied above
          editState: { ...editState, removeBackground: false },
        });
      } catch (error) {
        if (id !== latestIdRef.current) return;
        setError(error instanceof Error ? error.message : 'Failed to process image');
      }
    },
    [dispatch],
  );

  return { compress };
}
