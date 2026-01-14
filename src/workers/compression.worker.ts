import type { CompressionSettings, SupportedFormat } from "@/types";

// Worker message types
export interface CompressionRequest {
  type: "COMPRESS";
  id: string;
  imageData: ArrayBuffer;
  fileName: string;
  fileType: string;
  settings: CompressionSettings;
}

export interface CompressionResponse {
  type: "SUCCESS" | "ERROR" | "PROGRESS";
  id: string;
  blob?: Blob;
  error?: string;
  progress?: number;
}

// Get MIME type for format
function getMimeType(format: SupportedFormat): string {
  const mimeTypes: Record<SupportedFormat, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };
  return mimeTypes[format];
}

// Process image in worker using OffscreenCanvas
async function processImage(
  imageData: ArrayBuffer,
  settings: CompressionSettings
): Promise<Blob> {
  // Create blob from array buffer
  const blob = new Blob([imageData]);
  const bitmap = await createImageBitmap(blob);

  // Calculate dimensions
  let width = settings.width || bitmap.width;
  let height = settings.height || bitmap.height;

  if (settings.maintainAspectRatio && (settings.width || settings.height)) {
    const aspectRatio = bitmap.width / bitmap.height;
    if (settings.width && !settings.height) {
      height = Math.round(settings.width / aspectRatio);
    } else if (settings.height && !settings.width) {
      width = Math.round(settings.height * aspectRatio);
    }
  }

  // Create offscreen canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw image (strips metadata)
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Convert to blob
  const mimeType = getMimeType(settings.format);
  const quality = settings.quality / 100;

  return canvas.convertToBlob({ type: mimeType, quality });
}

// Worker message handler
self.onmessage = async (event: MessageEvent<CompressionRequest>) => {
  const { type, id, imageData, settings } = event.data;

  if (type === "COMPRESS") {
    try {
      // Send progress update
      self.postMessage({
        type: "PROGRESS",
        id,
        progress: 10,
      } as CompressionResponse);

      // Process image
      const result = await processImage(imageData, settings);

      // Send success response
      self.postMessage({
        type: "SUCCESS",
        id,
        blob: result,
      } as CompressionResponse);
    } catch (error) {
      self.postMessage({
        type: "ERROR",
        id,
        error: error instanceof Error ? error.message : "Compression failed",
      } as CompressionResponse);
    }
  }
};

export {};
