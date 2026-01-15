import type { BatchItem, BatchState } from "@/types";
import { create } from "zustand";

const MAX_BATCH_SIZE = 20;

interface BatchStore extends BatchState {
  // Actions
  addItems: (files: File[]) => { added: number; rejected: number };
  removeItem: (id: string) => void;
  updateItemFilename: (id: string, filename: string) => void;
  updateItemDimensions: (id: string, width: number, height: number) => void;
  clearAll: () => void;
  startProcessing: () => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  setCurrentIndex: (index: number) => void;
  updateItemStatus: (
    id: string,
    status: BatchItem["status"],
    data?: Partial<BatchItem>
  ) => void;
  reset: () => void;
}

export const useBatchStore = create<BatchStore>((set, get) => ({
  // Initial state
  items: [],
  isProcessing: false,
  isPaused: false,
  currentIndex: 0,

  // Add items to queue - returns count of added and rejected
  addItems: (files: File[]) => {
    const state = get();
    const remaining = MAX_BATCH_SIZE - state.items.length;

    if (remaining <= 0) {
      return { added: 0, rejected: files.length };
    }

    const filesToAdd = files.slice(0, remaining);
    const rejected = files.length - filesToAdd.length;

    const newItems: BatchItem[] = filesToAdd.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      outputFilename: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      status: "queued" as const,
      progress: 0,
    }));

    set((state) => ({
      items: [...state.items, ...newItems],
    }));

    return { added: filesToAdd.length, rejected };
  },

  // Remove single item
  removeItem: (id: string) => {
    const state = get();
    const item = state.items.find((i) => i.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }

    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }));
  },

  // Update output filename
  updateItemFilename: (id: string, filename: string) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, outputFilename: filename } : item
      ),
    }));
  },

  // Update item dimensions
  updateItemDimensions: (id: string, width: number, height: number) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, width, height } : item
      ),
    }));
  },

  // Clear all items
  clearAll: () => {
    const state = get();
    state.items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });

    set({
      items: [],
      isProcessing: false,
      isPaused: false,
      currentIndex: 0,
    });
  },

  // Start processing
  startProcessing: () => {
    set({ isProcessing: true, isPaused: false, currentIndex: 0 });
  },

  // Pause processing
  pauseProcessing: () => {
    set({ isPaused: true });
  },

  // Resume processing
  resumeProcessing: () => {
    set({ isPaused: false });
  },

  // Set current index
  setCurrentIndex: (index: number) => {
    set({ currentIndex: index });
  },

  // Update item status
  updateItemStatus: (
    id: string,
    status: BatchItem["status"],
    data?: Partial<BatchItem>
  ) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status, ...data } : item
      ),
    }));
  },

  // Full reset
  reset: () => {
    const state = get();
    state.items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });

    set({
      items: [],
      isProcessing: false,
      isPaused: false,
      currentIndex: 0,
    });
  },
}));

// Selector for batch statistics
export const useBatchStats = () => {
  const items = useBatchStore((state) => state.items);

  return {
    total: items.length,
    queued: items.filter((i) => i.status === "queued").length,
    processing: items.filter((i) => i.status === "processing").length,
    complete: items.filter((i) => i.status === "complete").length,
    errors: items.filter((i) => i.status === "error").length,
    canAddMore: items.length < MAX_BATCH_SIZE,
    remainingSlots: MAX_BATCH_SIZE - items.length,
    maxSize: MAX_BATCH_SIZE,
  };
};
