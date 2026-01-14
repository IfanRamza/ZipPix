import type { CompressionSettings, SupportedFormat } from "@/types";

/**
 * Compress an image using Canvas API
 * Note: @squoosh/lib requires Node.js environment with WASM
 * For browser, we use Canvas API as fallback
 */
import pica from "pica";

/**
 * Compress an image using Canvas API or Pica for high quality resizing
 */
export async function compressImage(
  file: File,
  settings: CompressionSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        // Calculate target dimensions
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

        // Check if resizing is needed
        const needsResize = width !== img.width || height !== img.height;

        // Use Pica for High Quality Resizing (Lanczos)
        if (needsResize) {
          const picaInstance = pica();
          const fromCanvas = document.createElement("canvas");
          fromCanvas.width = img.width;
          fromCanvas.height = img.height;
          const ctx = fromCanvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context missing");
          ctx.drawImage(img, 0, 0);

          const toCanvas = document.createElement("canvas");
          toCanvas.width = width;
          toCanvas.height = height;

          // Pica resize
          await picaInstance.resize(fromCanvas, toCanvas, {
            quality: 3, // Lanczos3
            unsharpAmount: 80,
            unsharpRadius: 0.6,
            unsharpThreshold: 2,
          });

          // Convert to blob
          const mimeType = getMimeType(settings.format);
          const quality = settings.quality / 100;

          // Pica's toBlob is better/faster usually but let's use standard for consistency with format support?
          // Actually pica has .toBlob which helps.
          const blob = await picaInstance.toBlob(toCanvas, mimeType, quality);
          URL.revokeObjectURL(url);
          resolve(blob);
          return;
        }

        // Standard logic for NO resize (just compression/conversion)
        const canvas = document.createElement("canvas");
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
export function getMimeType(format: SupportedFormat): string {
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
