import { convertHeic, isHeicFile } from '@/lib/heic';
import { validateFileSignature } from '@/lib/security';
import { validateFileType } from '@/lib/utils';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export type IntakeError = 'type' | 'size' | 'signature' | 'decode';
export type IntakeResult = { ok: true; file: File } | { ok: false; error: IntakeError };

export const INTAKE_MESSAGES: Record<IntakeError, string> = {
  type: 'Unsupported format. Use JPEG, PNG, WebP, AVIF, GIF or HEIC.',
  size: `File is larger than ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
  signature: "This file's contents don't match an image format.",
  decode: 'This HEIC image could not be converted. It may be corrupted.',
};

/** What the user actually supplied, before any conversion */
export interface SourceInfo {
  file: File;
  size: number;
  type: string;
}

// Converted files remember their original, so stats compare against the real upload
const sources = new WeakMap<File, SourceInfo>();

export function sourceOf(file: File): SourceInfo {
  return sources.get(file) ?? { file, size: file.size, type: file.type };
}

/**
 * Validate one file and make it decodable: cheap type/size checks first,
 * then magic bytes, then HEIC → PNG conversion when needed.
 */
export async function prepareImage(file: File, maxSize = MAX_FILE_SIZE): Promise<IntakeResult> {
  if (!validateFileType(file)) return { ok: false, error: 'type' };
  if (file.size > maxSize) return { ok: false, error: 'size' };
  try {
    if (!(await validateFileSignature(file))) return { ok: false, error: 'signature' };
    if (!(await isHeicFile(file))) return { ok: true, file };
  } catch {
    return { ok: false, error: 'signature' };
  }

  try {
    const converted = await convertHeic(file);
    sources.set(converted, { file, size: file.size, type: file.type || 'image/heic' });
    return { ok: true, file: converted };
  } catch (error) {
    console.warn('HEIC conversion failed', error);
    return { ok: false, error: 'decode' };
  }
}

/**
 * Keep only real images within the size limit. Files are prepared one at a
 * time so several HEIC decodes never hold their full-size pixels at once.
 * Once `limit` files are verified the rest are left unread and counted in `overLimit`.
 */
export async function verifyImageFiles(
  files: File[],
  limit = Infinity,
): Promise<{ verified: File[]; invalid: number; overLimit: number }> {
  const verified: File[] = [];
  let invalid = 0;
  for (const file of files) {
    if (verified.length >= limit) break;
    const result = await prepareImage(file);
    if (result.ok) verified.push(result.file);
    else invalid++;
  }
  return { verified, invalid, overLimit: files.length - verified.length - invalid };
}
