import { hasEdits } from '@/lib/editPipeline';
import { formatFromMime } from '@/lib/formats';
import { getImageDimensions } from '@/lib/image';
import { parseMetadata } from '@/lib/metadataParser';
import {
  type AppState,
  DEFAULT_EDIT_STATE,
  DEFAULT_SETTINGS,
  type ProcessingStatus,
} from '@/types';
import { create } from 'zustand';

const IDLE_STATUS: ProcessingStatus = {
  isCompressing: false,
  isRemovingBackground: false,
  error: undefined,
};

export const useImageStore = create<AppState>((set, get) => ({
  // State
  originalImage: null,
  editState: DEFAULT_EDIT_STATE,
  compressed: null,
  settings: DEFAULT_SETTINGS,
  status: IDLE_STATUS,

  // Actions
  setOriginalImage: async (file: File) => {
    const previewUrl = URL.createObjectURL(file);

    // Get dimensions and metadata in parallel
    let dimensions, metadata;
    try {
      [dimensions, metadata] = await Promise.all([
        getImageDimensions(previewUrl),
        parseMetadata(file),
      ]);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      throw error;
    }

    // Revoke old URLs only once the new image is ready
    const { originalImage, compressed } = get();
    if (originalImage) URL.revokeObjectURL(originalImage.previewUrl);
    if (compressed) URL.revokeObjectURL(compressed.url);

    set((state) => ({
      originalImage: {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        size: file.size,
        dimensions,
        metadata: metadata ?? undefined,
      },
      // Reset edits & output, and drop any explicit size from the previous image
      editState: DEFAULT_EDIT_STATE,
      compressed: null,
      settings: { ...state.settings, width: undefined, height: undefined, scale: 100 },
      status: IDLE_STATUS,
    }));
  },

  updateSettings: (newSettings) => {
    set((state) => ({ settings: { ...state.settings, ...newSettings } }));
  },

  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

  setCompressedImage: (blob, dimensions, target) => {
    const { compressed, settings } = get();
    if (compressed) URL.revokeObjectURL(compressed.url);

    set({
      compressed: {
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        dimensions,
        format: formatFromMime(blob.type) ?? settings.format,
        quality: target?.quality,
        targetMet: target?.targetMet,
      },
      status: IDLE_STATUS,
    });
  },

  reset: () => {
    const { originalImage, compressed } = get();
    if (originalImage) URL.revokeObjectURL(originalImage.previewUrl);
    if (compressed) URL.revokeObjectURL(compressed.url);

    set({
      originalImage: null,
      editState: DEFAULT_EDIT_STATE,
      compressed: null,
      settings: DEFAULT_SETTINGS,
      status: IDLE_STATUS,
    });
  },

  setError: (error) => {
    set((state) => ({
      status: { ...state.status, error, isCompressing: false, isRemovingBackground: false },
    }));
  },

  setProcessing: (isCompressing) => {
    set((state) => ({ status: { ...state.status, isCompressing, error: undefined } }));
  },

  setRemovingBackground: (isRemovingBackground) => {
    set((state) => ({ status: { ...state.status, isRemovingBackground } }));
  },

  // Edit actions - non-destructive
  updateEditState: (edits) => {
    set((state) => ({ editState: { ...state.editState, ...edits } }));
  },

  resetEdits: () => set({ editState: DEFAULT_EDIT_STATE }),

  hasEdits: () => hasEdits(get().editState),
}));
