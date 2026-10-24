import { useBatchStore } from '@/store/batchStore';
import type { BatchItem, CompressionSettings } from '@/types';
import { createCompressionWorker, type CompressionResponse } from '@/workers';
import { useCallback, useEffect, useRef } from 'react';

/** Run up to N images in parallel, one per worker, capped to keep memory sane */
function getPoolSize(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  return Math.max(1, Math.min(4, Math.floor(cores / 2)));
}

function runOnWorker(
  worker: Worker,
  item: BatchItem,
  settings: CompressionSettings,
): Promise<CompressionResponse> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent<CompressionResponse>) => {
      if (event.data.id !== item.id) return;
      worker.removeEventListener('message', onMessage);
      resolve(event.data);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'COMPRESS', id: item.id, source: item.file, settings });
  });
}

/**
 * Processes the batch queue with a small worker pool.
 * Pausing stops dispatching new items; in-flight items finish normally.
 */
export function useBatchProcessor() {
  const poolRef = useRef<Worker[]>([]);
  const runningRef = useRef(false);
  const isProcessing = useBatchStore((s) => s.isProcessing);
  const isPaused = useBatchStore((s) => s.isPaused);

  useEffect(() => {
    poolRef.current = Array.from({ length: getPoolSize() }, createCompressionWorker);
    return () => {
      poolRef.current.forEach((w) => w.terminate());
      poolRef.current = [];
      // Anything in flight is lost with the workers: put it back in the queue
      const { items, updateItem, stopProcessing } = useBatchStore.getState();
      items
        .filter((i) => i.status === 'processing')
        .forEach((i) => updateItem(i.id, { status: 'queued' }));
      stopProcessing();
    };
  }, []);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    const settings = useBatchStore.getState().settings;

    const takeNext = (): BatchItem | undefined => {
      const state = useBatchStore.getState();
      if (!state.isProcessing || state.isPaused) return undefined;
      const next = state.items.find((i) => i.status === 'queued');
      if (next) state.updateItem(next.id, { status: 'processing', error: undefined });
      return next;
    };

    const lane = async (worker: Worker) => {
      for (let item = takeNext(); item; item = takeNext()) {
        const result = await runOnWorker(worker, item, settings);
        const { updateItem, items } = useBatchStore.getState();
        if (!items.some((i) => i.id === item!.id)) continue; // removed meanwhile
        if (result.type === 'SUCCESS') {
          updateItem(item.id, {
            status: 'complete',
            compressedBlob: result.blob,
            compressedSize: result.blob.size,
            quality: result.target?.quality,
            targetMet: result.target?.targetMet,
            reusedSource: result.reusedSource,
          });
        } else {
          updateItem(item.id, { status: 'error', error: result.error });
        }
      }
    };

    try {
      await Promise.all(poolRef.current.map(lane));
    } finally {
      runningRef.current = false;
      const state = useBatchStore.getState();
      if (!state.isPaused && !state.items.some((i) => i.status === 'queued')) {
        state.stopProcessing();
      }
    }
  }, []);

  useEffect(() => {
    if (isProcessing && !isPaused) void run();
  }, [isProcessing, isPaused, run]);

  const start = useCallback(() => {
    const { items, updateItem, startProcessing } = useBatchStore.getState();
    // Retry failed items on a fresh start
    items
      .filter((i) => i.status === 'error')
      .forEach((i) => updateItem(i.id, { status: 'queued' }));
    startProcessing();
  }, []);

  return { start, isProcessing };
}
