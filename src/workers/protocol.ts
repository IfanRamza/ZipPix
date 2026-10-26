import type { CompressionSettings, EditState, ImageDimensions, TargetSizeResult } from '@/types';

export interface CompressionRequest {
  type: 'COMPRESS';
  id: string;
  /** Image source. Blobs/Files are structured-cloned by reference, no copy. */
  source: Blob;
  /**
   * When set, the decoded bitmap is kept in the worker and reused for
   * subsequent requests with the same key (e.g. while dragging the quality slider).
   */
  cacheKey?: string;
  settings: CompressionSettings;
  editState?: EditState;
}

export type CompressionResponse =
  | {
      type: 'SUCCESS';
      id: string;
      blob: Blob;
      dimensions: ImageDimensions;
      /** Present when settings.targetSize was honoured */
      target?: TargetSizeResult;
      /** Re-encoding saved nothing, so `blob` is the untouched source (it had no metadata) */
      reusedSource?: boolean;
    }
  | { type: 'ERROR'; id: string; error: string };

export function createCompressionWorker(): Worker {
  return new Worker(new URL('./compression.worker.ts', import.meta.url), { type: 'module' });
}
