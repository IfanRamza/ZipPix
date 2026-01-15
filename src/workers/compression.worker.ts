import type { CompressionSettings, EditState, SupportedFormat } from "@/types";

// Worker message types
export interface CompressionRequest {
  type: "COMPRESS";
  id: string;
  imageData: ArrayBuffer;
  fileName: string;
  fileType: string;
  settings: CompressionSettings;
  editState?: EditState;
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

// Apply edit transformations to canvas
function applyEdits(
  ctx: OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  canvas: OffscreenCanvas,
  editState: EditState
): { width: number; height: number } {
  const {
    crop,
    rotation,
    flipHorizontal,
    flipVertical,
    brightness,
    contrast,
    saturation,
  } = editState;

  // Determine source dimensions (after crop)
  const srcX = crop?.x ?? 0;
  const srcY = crop?.y ?? 0;
  const srcW = crop?.width ?? bitmap.width;
  const srcH = crop?.height ?? bitmap.height;

  // Determine if rotated 90 or 270 (dimensions swap)
  const isRotatedSideways = rotation === 90 || rotation === 270;
  const finalWidth = isRotatedSideways ? srcH : srcW;
  const finalHeight = isRotatedSideways ? srcW : srcH;

  // Resize canvas for final output
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // Apply transformations
  ctx.save();
  ctx.translate(finalWidth / 2, finalHeight / 2);

  // Apply rotation
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Apply flips
  const scaleX = flipHorizontal ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // Draw the cropped portion centered
  ctx.drawImage(
    bitmap,
    srcX,
    srcY,
    srcW,
    srcH, // Source rectangle
    -srcW / 2,
    -srcH / 2,
    srcW,
    srcH // Destination rectangle
  );

  ctx.restore();

  // Apply color filters if any
  if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
    const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
    const data = imageData.data;

    const brightnessFactor = brightness / 100;
    const contrastFactor = (contrast + 100) / 100;
    const saturationFactor = (saturation + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      r += 255 * brightnessFactor;
      g += 255 * brightnessFactor;
      b += 255 * brightnessFactor;

      // Contrast
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      // Saturation
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + saturationFactor * (r - gray);
      g = gray + saturationFactor * (g - gray);
      b = gray + saturationFactor * (b - gray);

      // Clamp
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return { width: finalWidth, height: finalHeight };
}

// Process image in worker using OffscreenCanvas
async function processImage(
  imageData: ArrayBuffer,
  settings: CompressionSettings,
  editState?: EditState
): Promise<Blob> {
  // Create blob from array buffer
  const blob = new Blob([imageData]);
  const bitmap = await createImageBitmap(blob);

  // Determine base dimensions after edits
  let baseWidth = bitmap.width;
  let baseHeight = bitmap.height;

  if (editState?.crop) {
    baseWidth = editState.crop.width;
    baseHeight = editState.crop.height;
  }

  // Swap if rotated sideways
  if (editState?.rotation === 90 || editState?.rotation === 270) {
    [baseWidth, baseHeight] = [baseHeight, baseWidth];
  }

  // Calculate final dimensions with resize settings
  let width = settings.width || baseWidth;
  let height = settings.height || baseHeight;

  if (settings.maintainAspectRatio && (settings.width || settings.height)) {
    const aspectRatio = baseWidth / baseHeight;
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

  // Apply edits if any
  if (editState && hasEdits(editState)) {
    // First apply edits to get the edited source
    const editCanvas = new OffscreenCanvas(baseWidth, baseHeight);
    const editCtx = editCanvas.getContext("2d");
    if (!editCtx) throw new Error("Failed to get edit canvas context");

    applyEdits(editCtx, bitmap, editCanvas, editState);

    // Then resize to final dimensions
    ctx.drawImage(
      editCanvas,
      0,
      0,
      editCanvas.width,
      editCanvas.height,
      0,
      0,
      width,
      height
    );
  } else {
    // No edits, just resize
    ctx.drawImage(bitmap, 0, 0, width, height);
  }

  bitmap.close();

  // Convert to blob
  const mimeType = getMimeType(settings.format);
  const quality = settings.quality / 100;

  return canvas.convertToBlob({ type: mimeType, quality });
}

// Check if editState has any edits
function hasEdits(editState: EditState): boolean {
  return !!(
    editState.crop ||
    editState.rotation !== 0 ||
    editState.flipHorizontal ||
    editState.flipVertical ||
    editState.brightness !== 0 ||
    editState.contrast !== 0 ||
    editState.saturation !== 0
  );
}

// Worker message handler
self.onmessage = async (event: MessageEvent<CompressionRequest>) => {
  const { type, id, imageData, settings, editState } = event.data;

  if (type === "COMPRESS") {
    try {
      // Send progress update
      self.postMessage({
        type: "PROGRESS",
        id,
        progress: 10,
      } as CompressionResponse);

      // Process image with edits
      const result = await processImage(imageData, settings, editState);

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
