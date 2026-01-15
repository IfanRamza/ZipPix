/**
 * Image editing utilities for canvas-based transformations
 */

export interface EditorState {
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
  brightness: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const DEFAULT_EDITOR_STATE: EditorState = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  crop: undefined,
};

/**
 * Apply all transformations to an image and return a new canvas
 */
export function applyTransformations(
  sourceImage: HTMLImageElement,
  state: EditorState
): HTMLCanvasElement {
  // Calculate dimensions after rotation
  const isRotated90or270 = state.rotation === 90 || state.rotation === 270;
  let width = isRotated90or270 ? sourceImage.height : sourceImage.width;
  let height = isRotated90or270 ? sourceImage.width : sourceImage.height;

  // Apply crop dimensions if set
  if (state.crop) {
    width = state.crop.width;
    height = state.crop.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  // Save context state
  ctx.save();

  // Move to center for rotation/flip
  ctx.translate(width / 2, height / 2);

  // Apply rotation
  if (state.rotation !== 0) {
    ctx.rotate((state.rotation * Math.PI) / 180);
  }

  // Apply flips
  const scaleX = state.flipHorizontal ? -1 : 1;
  const scaleY = state.flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // Draw image centered
  const drawWidth = isRotated90or270 ? sourceImage.height : sourceImage.width;
  const drawHeight = isRotated90or270 ? sourceImage.width : sourceImage.height;

  if (state.crop) {
    // Draw cropped region
    ctx.drawImage(
      sourceImage,
      state.crop.x,
      state.crop.y,
      state.crop.width,
      state.crop.height,
      -width / 2,
      -height / 2,
      width,
      height
    );
  } else {
    ctx.drawImage(sourceImage, -drawWidth / 2, -drawHeight / 2);
  }

  // Restore context
  ctx.restore();

  // Apply filters if any are set
  if (
    state.brightness !== 0 ||
    state.contrast !== 0 ||
    state.saturation !== 0
  ) {
    applyFilters(ctx, width, height, state);
  }

  return canvas;
}

/**
 * Apply brightness, contrast, and saturation filters
 */
function applyFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: EditorState
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const brightness = state.brightness / 100;
  const contrast = (state.contrast + 100) / 100;
  const saturation = (state.saturation + 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply brightness
    r += 255 * brightness;
    g += 255 * brightness;
    b += 255 * brightness;

    // Apply contrast
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // Apply saturation
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
    r = gray + saturation * (r - gray);
    g = gray + saturation * (g - gray);
    b = gray + saturation * (b - gray);

    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Load an image from URL and return HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Convert canvas to Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      mimeType,
      quality
    );
  });
}
