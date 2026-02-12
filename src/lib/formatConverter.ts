import type { SupportedFormat } from '@/types';

/**
 * Convert image to a different format
 */
export async function convertFormat(
  file: File,
  targetFormat: SupportedFormat,
  quality: number = 85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        const mimeType = `image/${targetFormat === 'jpeg' ? 'jpeg' : targetFormat}`;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Format conversion failed'));
            }
          },
          mimeType,
          quality / 100,
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Check if browser supports a format
 */
export function isFormatSupported(format: SupportedFormat): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const mimeType = `image/${format}`;
  const dataUrl = canvas.toDataURL(mimeType);

  // If format not supported, browser returns png
  return dataUrl.startsWith(`data:${mimeType}`);
}

/**
 * Get supported formats in current browser
 */
export function getSupportedFormats(): SupportedFormat[] {
  const formats: SupportedFormat[] = ['jpeg', 'png', 'webp', 'avif'];
  return formats.filter(isFormatSupported);
}

/**
 * Detect format from file
 */
export function detectFormat(file: File): SupportedFormat | null {
  const mimeToFormat: Record<string, SupportedFormat> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  return mimeToFormat[file.type] || null;
}
