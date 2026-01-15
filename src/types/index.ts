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
