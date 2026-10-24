import type { SupportedFormat } from '@/types';

const MIME_TYPES: Record<SupportedFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const EXTENSIONS: Record<SupportedFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};

const LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
  'image/gif': 'GIF',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
};

export function getMimeType(format: SupportedFormat): string {
  return MIME_TYPES[format];
}

export function getFileExtension(format: SupportedFormat): string {
  return EXTENSIONS[format];
}

/** Map a MIME type back to a supported output format (null if unknown) */
export function formatFromMime(mime: string): SupportedFormat | null {
  const entry = Object.entries(MIME_TYPES).find(([, m]) => m === mime);
  return entry ? (entry[0] as SupportedFormat) : null;
}

/** Human readable label for a format or MIME type */
export function formatLabel(formatOrMime: string): string {
  return LABELS[formatOrMime] || formatOrMime.split('/').pop()?.toUpperCase() || 'IMG';
}

let encodeSupportPromise: Promise<Record<SupportedFormat, boolean>> | null = null;

/**
 * Detect which formats the browser can *encode*.
 * Canvas silently falls back to PNG for unsupported types (e.g. WebP in older
 * Safari), so we probe once and cache the result. AVIF is always available:
 * the worker falls back to a WASM encoder when canvas can't produce it.
 */
export function detectEncodeSupport(): Promise<Record<SupportedFormat, boolean>> {
  if (!encodeSupportPromise) {
    encodeSupportPromise = (async () => {
      const canvas = new OffscreenCanvas(1, 1);
      canvas.getContext('2d');
      const probe = async (format: SupportedFormat) => {
        try {
          const blob = await canvas.convertToBlob({ type: MIME_TYPES[format] });
          return blob.type === MIME_TYPES[format];
        } catch {
          return false;
        }
      };
      return { jpeg: true, png: true, webp: await probe('webp'), avif: true };
    })();
  }
  return encodeSupportPromise;
}
