import { HEIC_TYPES, isDeclaredHeic } from '@/lib/heic';
import { strictSanitizeFilename } from '@/lib/security';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * @deprecated Use strictSanitizeFilename from '@/lib/security' instead.
 * Re-exported for backward compatibility.
 */
export { strictSanitizeFilename as sanitizeFilename } from '@/lib/security';

/**
 * @deprecated Use validateFileSignature from '@/lib/security' instead.
 * Re-exported for backward compatibility.
 */
export { validateFileSignature as checkMagicBytes } from '@/lib/security';

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}

/**
 * Validate file type against allowed image types
 * @param fileOrType - Either a File object or a MIME type string
 */
export function validateFileType(fileOrType: File | string): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  if (typeof fileOrType === 'string') {
    return validTypes.includes(fileOrType) || HEIC_TYPES.includes(fileOrType);
  }
  // Windows reports HEIC files with no MIME type, so fall back to the extension
  return validTypes.includes(fileOrType.type) || isDeclaredHeic(fileOrType);
}

/**
 * Calculate compression ratio percentage
 */
export function calculateReduction(originalSize: number, compressedSize: number): number {
  if (originalSize <= 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
}

/**
 * Generate output filename based on original and format
 */
export function generateOutputFilename(
  originalName: string,
  format: string,
  suffix: string = 'compressed',
): string {
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  // Sanitize with the real extension attached so dots inside the name are not mistaken for one
  return strictSanitizeFilename(`${baseName}_${suffix}.${format}`);
}

/** Default output base name (no extension) for a file, e.g. "photo.jpg" → "photo_compressed" */
export function defaultOutputBase(originalName: string): string {
  return generateOutputFilename(originalName, 'png').replace(/\.png$/, '');
}
