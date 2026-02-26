import { getImageDimensions } from '@/lib/imageProcessor';
import { parseMetadata } from '@/lib/metadataParser';
import {
  type AppState,
  type CompressionSettings,
  DEFAULT_EDIT_STATE,
  type EditState,
} from '@/types';
import { create } from 'zustand';

const DEFAULT_SETTINGS: CompressionSettings = {
  format: 'webp',
  quality: 85,
  maintainAspectRatio: true,
  stripMetadata: true,
  effort: 4,
  progressive: true,
  chromaSubsampling: '4:2:0',
};

export const useImageStore = create<AppState>((set, get) => ({
  // State
  originalImage: null,
  editState: DEFAULT_EDIT_STATE,
  compressedImage: null,
  compressedSize: 0,
  compressedUrl: null,
  settings: DEFAULT_SETTINGS,
  status: {
    isCompressing: false,
    isRemovingBackground: false,
    progress: 0,
    error: undefined,
  },
  sliderPosition: 50,

  // Actions
  setOriginalImage: async (file: File) => {
    // Revoke old URL if exists
    const state = get();
    if (state.originalImage?.previewUrl) {
      URL.revokeObjectURL(state.originalImage.previewUrl);
    }
    if (state.compressedUrl) {
      URL.revokeObjectURL(state.compressedUrl);
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Get dimensions and metadata in parallel
    const [dimensions, metadata] = await Promise.all([
      getImageDimensions(file),
      parseMetadata(file),
    ]);

    set({
      originalImage: {
        file,
        previewUrl,
        size: file.size,
        dimensions,
        metadata: metadata ?? undefined,
      },
      // Reset everything when new image is uploaded
      editState: DEFAULT_EDIT_STATE,
      compressedImage: null,
      compressedSize: 0,
      compressedUrl: null,
      status: { isCompressing: false, isRemovingBackground: false, progress: 0, error: undefined },
      sliderPosition: 50,
    });
  },

  updateSettings: (newSettings: Partial<CompressionSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  setCompressedImage: (blob: Blob) => {
    // Revoke old URL if exists
    const state = get();
    if (state.compressedUrl) {
      URL.revokeObjectURL(state.compressedUrl);
    }

    const compressedUrl = URL.createObjectURL(blob);

    set({
      compressedImage: blob,
      compressedSize: blob.size,
      compressedUrl,
      status: {
        isCompressing: false,
        isRemovingBackground: false,
        progress: 100,
        error: undefined,
      },
    });
  },

  reset: () => {
    // Cleanup URLs
    const state = get();
    if (state.originalImage?.previewUrl) {
      URL.revokeObjectURL(state.originalImage.previewUrl);
    }
    if (state.compressedUrl) {
      URL.revokeObjectURL(state.compressedUrl);
    }

    set({
      originalImage: null,
      editState: DEFAULT_EDIT_STATE,
      compressedImage: null,
      compressedSize: 0,
      compressedUrl: null,
      settings: DEFAULT_SETTINGS,
      status: { isCompressing: false, isRemovingBackground: false, progress: 0, error: undefined },
      sliderPosition: 50,
    });
  },

  setSliderPosition: (pos: number) => {
    set({ sliderPosition: Math.max(0, Math.min(100, pos)) });
  },

  setError: (error: string | undefined) => {
    set((state) => ({
      status: { ...state.status, error, isCompressing: false },
    }));
  },

  setProcessing: (isCompressing: boolean) => {
    set((state) => ({
      status: { ...state.status, isCompressing },
    }));
  },

  setRemovingBackground: (isRemovingBackground: boolean) => {
    set((state) => ({
      status: { ...state.status, isRemovingBackground },
    }));
  },

  // Edit actions - non-destructive
  updateEditState: (edits: Partial<EditState>) => {
    set((state) => ({
      editState: { ...state.editState, ...edits },
    }));
  },

  resetEdits: () => {
    set({ editState: DEFAULT_EDIT_STATE });
  },

  hasEdits: () => {
    const { editState } = get();
    return !!(
      editState.crop ||
      editState.rotation !== 0 ||
      editState.flipHorizontal ||
      editState.flipVertical ||
      editState.brightness !== 0 ||
      editState.contrast !== 0 ||
      editState.saturation !== 0 ||
      editState.removeBackground
    );
  },
}));
