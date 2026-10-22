import type { ParsedMetadata } from '@/lib/metadataParser';

export type SupportedFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface CompressionSettings {
  format: SupportedFormat;
  quality: number; // 1-100, ignored for PNG (lossless)
  /** Relative resize in percent of the edited image. Used when width/height are not set. */
  scale: number;
  /** Explicit output size (single-image "Custom" mode). Takes precedence over scale. */
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

export const DEFAULT_SETTINGS: CompressionSettings = {
  format: 'webp',
  quality: 85,
  scale: 100,
  maintainAspectRatio: true,
};

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Non-destructive edit state - stored separately from original image
export interface EditState {
  crop?: CropArea;
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  removeBackground: boolean;
}

export const DEFAULT_EDIT_STATE: EditState = {
  crop: undefined,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  removeBackground: false,
};

export interface ImageFileState {
  /** Stable id used as a cache key for decoded bitmaps and background removal */
  id: string;
  file: File;
  previewUrl: string;
  size: number;
  dimensions: ImageDimensions;
  metadata?: ParsedMetadata;
}

export interface CompressedImageState {
  blob: Blob;
  url: string;
  size: number;
  dimensions: ImageDimensions;
  /** Format the browser actually produced (may differ from the requested one) */
  format: SupportedFormat;
}

export interface ProcessingStatus {
  isCompressing: boolean;
  isRemovingBackground: boolean;
  error?: string;
}

export interface AppState {
  // Original image - NEVER modified after upload
  originalImage: ImageFileState | null;

  // Non-destructive edit state
  editState: EditState;

  // Compressed output
  compressed: CompressedImageState | null;

  // Compression settings
  settings: CompressionSettings;
  status: ProcessingStatus;

  // Actions
  setOriginalImage: (file: File) => Promise<void>;
  updateSettings: (settings: Partial<CompressionSettings>) => void;
  resetSettings: () => void;
  setCompressedImage: (blob: Blob, dimensions: ImageDimensions) => void;
  reset: () => void;
  setError: (error: string | undefined) => void;
  setProcessing: (isProcessing: boolean) => void;
  setRemovingBackground: (isRemoving: boolean) => void;

  // Edit actions
  updateEditState: (edits: Partial<EditState>) => void;
  resetEdits: () => void;
  hasEdits: () => boolean;
}

// Batch processing types
export interface BatchItem {
  id: string;
  file: File;
  /** Small generated thumbnail (object URL), set once decoded */
  thumbnailUrl?: string;
  outputFilename: string; // Editable output filename (without extension)
  status: 'queued' | 'processing' | 'complete' | 'error';
  width?: number;
  height?: number;
  compressedBlob?: Blob;
  compressedSize?: number;
  error?: string;
}

export interface BatchState {
  items: BatchItem[];
  isProcessing: boolean;
  isPaused: boolean;
}
