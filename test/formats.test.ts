import { describe, expect, test } from 'bun:test';
import { formatFromMime, formatLabel, getFileExtension, getMimeType } from '../src/lib/formats';
import { buildZip, dedupeNames } from '../src/lib/zip';

describe('formats', () => {
  test('getMimeType / formatFromMime round-trip', () => {
    for (const f of ['jpeg', 'png', 'webp', 'avif'] as const) {
      expect(formatFromMime(getMimeType(f))).toBe(f);
    }
    expect(formatFromMime('image/gif')).toBe(null);
  });

  test('getFileExtension', () => {
    expect(getFileExtension('jpeg')).toBe('jpg');
    expect(getFileExtension('avif')).toBe('avif');
  });

  test('formatLabel', () => {
    expect(formatLabel('image/webp')).toBe('WebP');
    expect(formatLabel('jpeg')).toBe('JPEG');
    expect(formatLabel('image/heic')).toBe('HEIC');
  });
});

describe('zip', () => {
  test('dedupeNames makes names unique (case-insensitive)', () => {
    expect(dedupeNames(['a.jpg', 'A.jpg', 'b.jpg', 'a.jpg'])).toEqual([
      'a.jpg',
      'A (2).jpg',
      'b.jpg',
      'a (3).jpg',
    ]);
  });

  test('buildZip keeps every entry and uses the real output extension', async () => {
    const { unzipSync } = await import('fflate');
    const zip = await buildZip([
      { name: 'photo', blob: new Blob(['1'], { type: 'image/webp' }) },
      { name: 'photo', blob: new Blob(['2'], { type: 'image/webp' }) },
      { name: 'logo', blob: new Blob(['3'], { type: 'image/png' }) },
    ]);
    const files = Object.keys(unzipSync(new Uint8Array(await zip.arrayBuffer())));
    expect(files.sort()).toEqual(['logo.png', 'photo (2).webp', 'photo.webp']);
  });
});
