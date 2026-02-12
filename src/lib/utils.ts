import { strictSanitizeFilename } from "@/lib/security";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * @deprecated Use strictSanitizeFilename from '@/lib/security' instead.
 * Re-exported for backward compatibility.
 */
export { strictSanitizeFilename as sanitizeFilename } from "@/lib/security";

/**
 * @deprecated Use validateFileSignature from '@/lib/security' instead.
 * Re-exported for backward compatibility.
 */
export { validateFileSignature as checkMagicBytes } from "@/lib/security";

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
 * @param fileOrType - Either a File object or a MIME type string
 */
export function validateFileType(fileOrType: File | string): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ];
  const mimeType =
    typeof fileOrType === "string" ? fileOrType : fileOrType.type;
  return validTypes.includes(mimeType);
}

/**
 * Calculate compression ratio percentage
 */
export function calculateReduction(
  originalSize: number,
  compressedSize: number,
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
  suffix: string = "compressed",
): string {
  const lastDot = originalName.lastIndexOf(".");
  const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const safeBase = strictSanitizeFilename(baseName);
  return `${safeBase}_${suffix}.${format}`;
}
