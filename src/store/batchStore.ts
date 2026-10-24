import { createThumbnail } from '@/lib/image';
import { sourceOf } from '@/lib/intake';
import { persistSettings } from '@/lib/persistedSettings';
import { strictSanitizeFilename } from '@/lib/security';
import {
  type BatchItem,
  type BatchState,
  type CompressionSettings,
  DEFAULT_SETTINGS,
} from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

export const MAX_BATCH_SIZE = 20;

interface BatchStore extends BatchState {
  /** Batch has its own settings so single-image sizes never leak into it */
  settings: CompressionSettings;
  updateSettings: (settings: Partial<CompressionSettings>) => void;
  resetSettings: () => void;

  addItems: (files: File[]) => { added: number; rejected: number };
  removeItem: (id: string) => void;
  updateItemFilename: (id: string, filename: string) => void;
  clearAll: () => void;
  startProcessing: () => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  stopProcessing: () => void;
  updateItem: (id: string, data: Partial<BatchItem>) => void;
}

function revokeItem(item: BatchItem) {
  if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
}

export const useBatchStore = create<BatchStore>()(
  persist(
    (set, get) => ({
      items: [],
      isProcessing: false,
      isPaused: false,
      settings: { ...DEFAULT_SETTINGS },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
          // Settings changed: finished items are stale and need re-processing
          items: state.isProcessing
            ? state.items
            : state.items.map((item) =>
                item.status === 'complete' || item.status === 'error'
                  ? {
                      ...item,
                      status: 'queued',
                      compressedBlob: undefined,
                      quality: undefined,
                      targetMet: undefined,
                      reusedSource: undefined,
                      error: undefined,
                    }
                  : item,
              ),
        }));
      },

      // DEFAULT_SETTINGS has no targetSize key, so clear it explicitly to leave target mode
      resetSettings: () => get().updateSettings({ ...DEFAULT_SETTINGS, targetSize: undefined }),

      addItems: (files) => {
        const remaining = MAX_BATCH_SIZE - get().items.length;
        if (remaining <= 0) return { added: 0, rejected: files.length };

        const filesToAdd = files.slice(0, remaining);
        const newItems: BatchItem[] = filesToAdd.map((file) => {
          const lastDot = file.name.lastIndexOf('.');
          const baseName = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;
          return {
            id: crypto.randomUUID(),
            file,
            outputFilename: strictSanitizeFilename(baseName),
            status: 'queued',
          };
        });

        set((state) => ({ items: [...state.items, ...newItems] }));

        // Generate thumbnails sequentially in the background (one decode per file)
        void (async () => {
          for (const item of newItems) {
            try {
              const thumb = await createThumbnail(item.file);
              if (!get().items.some((i) => i.id === item.id)) {
                URL.revokeObjectURL(thumb.url);
                continue;
              }
              get().updateItem(item.id, {
                thumbnailUrl: thumb.url,
                width: thumb.width,
                height: thumb.height,
              });
            } catch {
              // Thumbnail is cosmetic; compression will surface real decode errors
            }
          }
        })();

        return { added: filesToAdd.length, rejected: files.length - filesToAdd.length };
      },

      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (item) revokeItem(item);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateItemFilename: (id, filename) => {
        get().updateItem(id, { outputFilename: filename });
      },

      clearAll: () => {
        get().items.forEach(revokeItem);
        set({ items: [], isProcessing: false, isPaused: false });
      },

      startProcessing: () => set({ isProcessing: true, isPaused: false }),
      pauseProcessing: () => set({ isPaused: true }),
      resumeProcessing: () => set({ isPaused: false }),
      stopProcessing: () => set({ isProcessing: false, isPaused: false }),

      updateItem: (id, data) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...data } : item)),
        }));
      },
    }),
    // The queue holds Files and can't be stored; only the chosen settings are remembered
    persistSettings<BatchStore>('zippix:batch-settings', [
      'format',
      'quality',
      'scale',
      'targetSize',
      'paletteColors',
      'maintainAspectRatio',
    ]),
  ),
);

// Selector for batch statistics (shallow-compared so unrelated updates don't re-render)
export const useBatchStats = () =>
  useBatchStore(
    useShallow((state) => {
      const { items } = state;
      let queued = 0;
      let processing = 0;
      let complete = 0;
      let errors = 0;
      let overTarget = 0;
      let originalBytes = 0;
      let compressedBytes = 0;
      for (const item of items) {
        if (item.status === 'queued') queued++;
        else if (item.status === 'processing') processing++;
        else if (item.status === 'complete') {
          complete++;
          if (item.targetMet === false) overTarget++;
          originalBytes += sourceOf(item.file).size;
          compressedBytes += item.compressedSize ?? 0;
        } else errors++;
      }
      return {
        total: items.length,
        queued,
        processing,
        complete,
        errors,
        overTarget,
        originalBytes,
        compressedBytes,
        canAddMore: items.length < MAX_BATCH_SIZE,
        remainingSlots: MAX_BATCH_SIZE - items.length,
        maxSize: MAX_BATCH_SIZE,
      };
    }),
  );
