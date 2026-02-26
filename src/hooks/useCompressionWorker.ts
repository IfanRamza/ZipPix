import { removeImageBackground } from '@/lib/backgroundRemover';
import { useImageStore } from '@/store/imageStore';
import type { CompressionSettings, EditState } from '@/types';
import { useCallback, useEffect, useRef } from 'react';

interface CompressionResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  id: string;
  blob?: Blob;
  error?: string;
  progress?: number;
}

/**
 * Hook for using compression worker with non-destructive edit support.
 * Background removal runs on the main thread (ONNX/WASM requirement),
 * then the result is passed to the compression worker for final processing.
 */
export function useCompressionWorker() {
  const workerRef = useRef<Worker | null>(null);
  const { setCompressedImage, setError, setProcessing, setRemovingBackground } = useImageStore();

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (event: MessageEvent<CompressionResponse>) => {
      const { type, blob, error } = event.data;

      switch (type) {
        case 'SUCCESS':
          if (blob) {
            setCompressedImage(blob);
          }
          break;
        case 'ERROR':
          setError(error || 'Compression failed');
          break;
        case 'PROGRESS':
          // Could update progress state here
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      setError(`Worker error: ${error.message}`);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setCompressedImage, setError]);

  // Compress function with edit state support
  const compress = useCallback(
    async (file: File, settings: CompressionSettings, editState?: EditState) => {
      if (!workerRef.current) {
        setError('Worker not initialized');
        return;
      }

      setProcessing(true);

      try {
        let imageData: ArrayBuffer;

        // If background removal is requested, run it on main thread first
        if (editState?.removeBackground) {
          setRemovingBackground(true);
          const blob = new Blob([await file.arrayBuffer()], { type: file.type });
          const bgRemovedBlob = await removeImageBackground(blob);
          imageData = await bgRemovedBlob.arrayBuffer();
          setRemovingBackground(false);
        } else {
          imageData = await file.arrayBuffer();
        }

        // Pass the edit state to the worker, but clear removeBackground
        // since it's already been applied on the main thread
        const workerEditState = editState ? { ...editState, removeBackground: false } : undefined;

        workerRef.current.postMessage({
          type: 'COMPRESS',
          id: Date.now().toString(),
          imageData,
          fileName: file.name,
          fileType: file.type,
          settings,
          editState: workerEditState,
        });
      } catch (error) {
        setRemovingBackground(false);
        setError(error instanceof Error ? error.message : 'Failed to process image');
      }
    },
    [setError, setProcessing, setRemovingBackground],
  );

  return { compress };
}
