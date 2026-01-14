import type { CompressionSettings, SupportedFormat } from "@/types";

/**
 * Compress an image using Canvas API
 * Note: @squoosh/lib requires Node.js environment with WASM
 * For browser, we use Canvas API as fallback
 */
export async function compressImage(
  file: File,
  settings: CompressionSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");

        // Apply resize if specified
        let width = settings.width || img.width;
        let height = settings.height || img.height;

        if (
          settings.maintainAspectRatio &&
          (settings.width || settings.height)
        ) {
          const aspectRatio = img.width / img.height;
          if (settings.width && !settings.height) {
            height = Math.round(settings.width / aspectRatio);
          } else if (settings.height && !settings.width) {
            width = Math.round(settings.height * aspectRatio);
          } else if (settings.width && settings.height) {
            // Fit within bounds while maintaining aspect ratio
            const targetRatio = settings.width / settings.height;
            if (aspectRatio > targetRatio) {
              height = Math.round(settings.width / aspectRatio);
            } else {
              width = Math.round(settings.height * aspectRatio);
            }
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Draw image (this strips metadata)
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality
        const mimeType = getMimeType(settings.format);
        const quality = settings.quality / 100;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          mimeType,
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Get image dimensions from a file
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Get MIME type for format
 */
function getMimeType(format: SupportedFormat): string {
  const mimeTypes: Record<SupportedFormat, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };
  return mimeTypes[format];
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: SupportedFormat): string {
  const extensions: Record<SupportedFormat, string> = {
    jpeg: "jpg",
    png: "png",
    webp: "webp",
    avif: "avif",
  };
  return extensions[format];
}
