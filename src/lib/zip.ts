import { formatFromMime, getFileExtension } from '@/lib/formats';
import { strictSanitizeFilename } from '@/lib/security';

export interface ZipEntry {
  name: string; // base name, no extension
  blob: Blob;
}

/** Make names unique: "photo.jpg", "photo.jpg" → "photo.jpg", "photo (2).jpg" */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  });
}

/**
 * Build a ZIP of already-compressed images. Entries are stored (level 0):
 * re-deflating JPEG/WebP/AVIF wastes CPU for ~0% gain.
 */
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const { zipSync } = await import('fflate');

  const withExt = entries.map((e) => {
    const format = formatFromMime(e.blob.type);
    const ext = format ? getFileExtension(format) : 'bin';
    return {
      base: strictSanitizeFilename(e.name).replace(/\.[^.]+$/, '') || 'image',
      ext,
      blob: e.blob,
    };
  });
  const unique = dedupeNames(withExt.map((e) => `${e.base}.${e.ext}`));

  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  await Promise.all(
    withExt.map(async (e, i) => {
      files[unique[i]] = [new Uint8Array(await e.blob.arrayBuffer()), { level: 0 }];
    }),
  );

  const zipped = zipSync(files);
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}
