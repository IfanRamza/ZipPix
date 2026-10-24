import { validateFileSignature } from '@/lib/security';
import { validateFileType } from '@/lib/utils';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Keep only real images within the size limit: cheap type/size checks first,
 * then magic bytes in parallel (reads the first 12 bytes of each file).
 */
export async function verifyImageFiles(
  files: File[],
): Promise<{ verified: File[]; invalid: number }> {
  const candidates = files.filter((f) => validateFileType(f) && f.size <= MAX_FILE_SIZE);
  const checks = await Promise.all(
    candidates.map((f) => validateFileSignature(f).catch(() => false)),
  );
  const verified = candidates.filter((_, i) => checks[i]);
  return { verified, invalid: files.length - verified.length };
}
