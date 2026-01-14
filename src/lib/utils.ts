import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize filename to prevent path traversal and invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let name = filename.replace(/^.*[\\/]/, "");

  // Remove null bytes
  name = name.replace(/\0/g, "");

  // Remove path traversal attempts
  name = name.replace(/\.\./g, "");

  // Split name and extension
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;

  // Sanitize base name (keep alphanumeric, dash, underscore, space)
  const safeBase =
    base
      .replace(/[^a-zA-Z0-9\-_\s]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 100) || "unnamed";

  return ext ? `${safeBase}.${ext}` : safeBase;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  if (bytes < 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${
    sizes[index]
  }`;
}

/**
 * Validate file type against allowed image types
 */
export function validateFileType(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ];
  return validTypes.includes(file.type);
}

/**
 * Check magic bytes to verify file type matches content
 */
export async function checkMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF
    if (file.type === "image/jpeg") {
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (file.type === "image/png") {
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    }

    // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
    if (file.type === "image/webp") {
      return (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    }

    // GIF: 47 49 46 38
    if (file.type === "image/gif") {
      return (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38
      );
    }

    // AVIF: starts with ftyp box containing 'avif'
    if (file.type === "image/avif") {
      // Check for ftyp box
      return (
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70
      );
    }

    return true; // Allow unknown types with warning
  } catch {
    return false;
  }
}

/**
 * Calculate compression ratio percentage
 */
export function calculateReduction(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize <= 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
}

/**
 * Generate output filename based on original and format
 */
export function generateOutputFilename(
  originalName: string,
  format: string,
  suffix: string = "compressed"
): string {
  const lastDot = originalName.lastIndexOf(".");
  const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const safeBase = sanitizeFilename(baseName);
  return `${safeBase}_${suffix}.${format}`;
}
