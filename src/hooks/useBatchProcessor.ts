import { useBatchStore } from '@/store/batchStore';
import { useImageStore } from '@/store/imageStore';
import type { CompressionSettings } from '@/types';
import { useCallback, useEffect, useRef } from 'react';

interface CompressionResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  id: string;
  blob?: Blob;
  error?: string;
  progress?: number;
}

/**
 * Hook for batch processing multiple images
 */
export function useBatchProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const processingRef = useRef(false);

  const {
    items,
    isProcessing,
    isPaused,
    currentIndex,
    startProcessing,
    setCurrentIndex,
    updateItemStatus,
  } = useBatchStore();

  const { settings } = useImageStore();

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/compression.worker.ts', import.meta.url), {
      type: 'module',
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Process single item
  const processItem = useCallback(
    async (itemId: string, file: File, compressionSettings: CompressionSettings) => {
      return new Promise<void>((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const messageHandler = (event: MessageEvent<CompressionResponse>) => {
          const { type, blob, error, progress } = event.data;

          switch (type) {
            case 'PROGRESS':
              updateItemStatus(itemId, 'processing', {
                progress: progress ?? 0,
              });
              break;
            case 'SUCCESS':
              if (blob) {
                updateItemStatus(itemId, 'complete', {
                  progress: 100,
                  compressedBlob: blob,
                  compressedSize: blob.size,
                });
              }
              workerRef.current?.removeEventListener('message', messageHandler);
              resolve();
              break;
            case 'ERROR':
              updateItemStatus(itemId, 'error', {
                error: error || 'Compression failed',
              });
              workerRef.current?.removeEventListener('message', messageHandler);
              reject(new Error(error));
              break;
          }
        };

        workerRef.current.addEventListener('message', messageHandler);

        // Start compression
        updateItemStatus(itemId, 'processing', { progress: 0 });

        file.arrayBuffer().then((arrayBuffer) => {
          workerRef.current?.postMessage({
            type: 'COMPRESS',
            id: itemId,
            imageData: arrayBuffer,
            fileName: file.name,
            fileType: file.type,
            settings: compressionSettings,
          });
        });
      });
    },
    [updateItemStatus],
  );

  // Process queue
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      for (let i = currentIndex; i < items.length; i++) {
        // Check if paused
        const state = useBatchStore.getState();
        if (state.isPaused) {
          setCurrentIndex(i);
          break;
        }

        // Check if still processing
        if (!state.isProcessing) {
          break;
        }

        const item = items[i];
        if (item.status === 'queued' || item.status === 'error') {
          setCurrentIndex(i);
          try {
            await processItem(item.id, item.file, settings);
          } catch (error) {
            console.error(`Failed to process ${item.file.name}:`, error);
          }
        }
      }

      // Check if all done
      const finalState = useBatchStore.getState();
      const allDone = finalState.items.every(
        (item) => item.status === 'complete' || item.status === 'error',
      );
      if (allDone && finalState.isProcessing) {
        useBatchStore.setState({ isProcessing: false });
      }
    } finally {
      processingRef.current = false;
    }
  }, [items, currentIndex, settings, processItem, setCurrentIndex]);

  // Watch for processing state changes
  useEffect(() => {
    if (isProcessing && !isPaused) {
      processQueue();
    }
  }, [isProcessing, isPaused, processQueue]);

  // Start processing handler
  const start = useCallback(() => {
    startProcessing();
  }, [startProcessing]);

  return {
    start,
    isProcessing: processingRef.current,
  };
}
