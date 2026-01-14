export type SupportedFormat = "jpeg" | "png" | "webp" | "avif";

export interface CompressionSettings {
  format: SupportedFormat;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  stripMetadata: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageFileState {
  file: File;
  previewUrl: string;
  size: number;
  dimensions: ImageDimensions;
  metadata?: Record<string, unknown>;
}

export interface ProcessingStatus {
  isCompressing: boolean;
  progress: number;
  error?: string;
}

export interface AppState {
  originalImage: ImageFileState | null;
  compressedImage: Blob | null;
  compressedSize: number;
  compressedUrl: string | null;
  settings: CompressionSettings;
  status: ProcessingStatus;
  sliderPosition: number;
  setOriginalImage: (file: File) => Promise<void>;
  updateSettings: (settings: Partial<CompressionSettings>) => void;
  setCompressedImage: (blob: Blob) => void;
  reset: () => void;
  setSliderPosition: (pos: number) => void;
  setError: (error: string | undefined) => void;
  setProcessing: (isProcessing: boolean) => void;
}
