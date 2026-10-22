import { getEditedSize, renderEdited } from '@/lib/editPipeline';
import type { EditState, ImageDimensions } from '@/types';

/** Read intrinsic dimensions (EXIF orientation applied) without blocking the main thread */
export async function getImageDimensions(src: Blob | string): Promise<ImageDimensions> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    throw new Error('Failed to load image');
  } finally {
    if (typeof src !== 'string') URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  );
}

/**
 * Render a downscaled preview of `source` with edits applied.
 * Previews never need more pixels than the screen can show, which keeps
 * edits on 24MP+ photos responsive.
 */
export async function renderPreview(
  source: Blob,
  edit: EditState,
  maxSize = 2048,
): Promise<{ url: string; dimensions: ImageDimensions }> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  try {
    const edited = getEditedSize(bitmap, edit);
    const factor = Math.min(1, maxSize / Math.max(edited.width, edited.height));
    const out = {
      width: Math.max(1, Math.round(edited.width * factor)),
      height: Math.max(1, Math.round(edited.height * factor)),
    };

    const canvas = document.createElement('canvas');
    canvas.width = out.width;
    canvas.height = out.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    renderEdited(ctx, bitmap, edit, out);

    const blob = await canvasToBlob(canvas, 'image/png');
    return { url: URL.createObjectURL(blob), dimensions: edited };
  } finally {
    bitmap.close();
  }
}

/** Small thumbnail + intrinsic size, decoding the source exactly once */
export async function createThumbnail(
  file: Blob,
  maxSize = 160,
): Promise<{ url: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const factor = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * factor));
    canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 'image/webp', 0.8);
    return { url: URL.createObjectURL(blob), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/** Trigger a browser download for a blob or object URL */
export function downloadFile(data: Blob | string, filename: string): void {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000);
}
