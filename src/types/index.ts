import type { ParsedMetadata } from "@/lib/metadataParser";

export type SupportedFormat = "jpeg" | "png" | "webp" | "avif";
export type ChromaSubsampling = "4:4:4" | "4:2:2" | "4:2:0";

export interface CompressionSettings {
  format: SupportedFormat;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  stripMetadata: boolean;
  // Advanced settings
  effort: number; // 0-10, higher = slower but better compression
  progressive: boolean; // Progressive JPEG
  chromaSubsampling: ChromaSubsampling; // Color subsampling
}

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
}

export const DEFAULT_EDIT_STATE: EditState = {
  crop: undefined,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export interface ImageFileState {
  file: File;
  previewUrl: string;
  size: number;
  dimensions: ImageDimensions;
  metadata?: ParsedMetadata;
}

export interface ProcessingStatus {
  isCompressing: boolean;
  progress: number;
  error?: string;
}

export interface AppState {
  // Original image - NEVER modified after upload
  originalImage: ImageFileState | null;

  // Non-destructive edit state
  editState: EditState;

  // Compressed output
  compressedImage: Blob | null;
  compressedSize: number;
  compressedUrl: string | null;

  // Compression settings
  settings: CompressionSettings;
  status: ProcessingStatus;
  sliderPosition: number;

  // Actions
  setOriginalImage: (file: File) => Promise<void>;
  updateSettings: (settings: Partial<CompressionSettings>) => void;
  setCompressedImage: (blob: Blob) => void;
  reset: () => void;
  setSliderPosition: (pos: number) => void;
  setError: (error: string | undefined) => void;
  setProcessing: (isProcessing: boolean) => void;

  // Edit actions
  updateEditState: (edits: Partial<EditState>) => void;
  resetEdits: () => void;
  hasEdits: () => boolean;
}
