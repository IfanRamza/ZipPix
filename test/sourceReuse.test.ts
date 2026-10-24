import { hasPrivateMetadata, shouldReuseSource } from '@/lib/sourceReuse';
import { describe, expect, it } from 'bun:test';

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );

const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u32le = (n: number) => u32be(n).reverse();

/** JPEG segment: marker + 2-byte length (which counts itself) + payload */
const segment = (marker: number, payload: number[] = [0, 0]) => [
  0xff,
  marker,
  (payload.length + 2) >> 8,
  (payload.length + 2) & 255,
  ...payload,
];
const jpeg = (...segments: number[][]) =>
  bytes([0xff, 0xd8], ...segments, [0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const chunk = (type: string, data: number[] = []) =>
  bytes(u32be(data.length), type, data, [0, 0, 0, 0]);
const png = (...types: string[]) => {
  const parts = [
    bytes(PNG_SIGNATURE),
    ...types.map((t) => chunk(t, t === 'IHDR' ? Array(13).fill(0) : [1])),
  ];
  return new Uint8Array(parts.flatMap((p) => [...p]));
};

const webpChunk = (type: string, size: number) =>
  bytes(type, u32le(size), Array(size + (size & 1)).fill(0));
const webp = (...chunks: Uint8Array[]) => {
  const body = chunks.flatMap((c) => [...c]);
  return bytes('RIFF', u32le(body.length + 4), 'WEBP', body);
};

describe('hasPrivateMetadata', () => {
  it('passes a JPEG with only JFIF, ICC and quantisation tables', () => {
    const file = jpeg(segment(0xe0, [74, 70, 73, 70, 0]), segment(0xe2), segment(0xdb));
    expect(hasPrivateMetadata(file, 'image/jpeg')).toBe(false);
  });

  it.each([
    ['EXIF/XMP (APP1)', 0xe1],
    ['IPTC (APP13)', 0xed],
    ['a comment', 0xfe],
  ])('flags a JPEG with %s', (_, marker) => {
    expect(hasPrivateMetadata(jpeg(segment(0xe0), segment(marker)), 'image/jpeg')).toBe(true);
  });

  it('treats a truncated JPEG header as having metadata', () => {
    expect(hasPrivateMetadata(bytes([0xff, 0xd8], segment(0xe0).slice(0, 3)), 'image/jpeg')).toBe(
      true,
    );
  });

  it('passes a PNG with only image chunks', () => {
    expect(hasPrivateMetadata(png('IHDR', 'PLTE', 'IDAT', 'IEND'), 'image/png')).toBe(false);
  });

  it.each(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'])('flags a PNG with %s', (type) => {
    expect(hasPrivateMetadata(png('IHDR', 'IDAT', type, 'IEND'), 'image/png')).toBe(true);
  });

  it('passes a plain WebP, including odd-sized padded chunks', () => {
    expect(
      hasPrivateMetadata(webp(webpChunk('VP8X', 10), webpChunk('VP8L', 7)), 'image/webp'),
    ).toBe(false);
  });

  it.each(['EXIF', 'XMP '])('flags a WebP with %s', (type) => {
    const file = webp(webpChunk('VP8X', 10), webpChunk('VP8 ', 4), webpChunk(type, 3));
    expect(hasPrivateMetadata(file, 'image/webp')).toBe(true);
  });

  it('assumes metadata for formats it cannot inspect or mismatched bytes', () => {
    expect(hasPrivateMetadata(bytes('....ftypavif'), 'image/avif')).toBe(true);
    expect(hasPrivateMetadata(png('IHDR', 'IEND'), 'image/jpeg')).toBe(true);
  });
});

describe('shouldReuseSource', () => {
  const clean = new Blob([png('IHDR', 'IDAT', 'IEND')], { type: 'image/png' });
  const larger = (type = 'image/png') => new Blob([new Uint8Array(clean.size + 10)], { type });

  it('reuses a clean source when re-encoding saved nothing', async () => {
    expect(await shouldReuseSource(clean, larger(), true)).toBe(true);
    expect(
      await shouldReuseSource(
        clean,
        new Blob([new Uint8Array(clean.size)], { type: 'image/png' }),
        true,
      ),
    ).toBe(true);
  });

  it('keeps the output when it is smaller', async () => {
    const smaller = new Blob([new Uint8Array(4)], { type: 'image/png' });
    expect(await shouldReuseSource(clean, smaller, true)).toBe(false);
  });

  it('keeps the output when pixels or format changed', async () => {
    expect(await shouldReuseSource(clean, larger(), false)).toBe(false);
    expect(await shouldReuseSource(clean, larger('image/webp'), true)).toBe(false);
  });

  it('never hands back a source that still has metadata', async () => {
    const tagged = new Blob([png('IHDR', 'tEXt', 'IDAT', 'IEND')], { type: 'image/png' });
    expect(await shouldReuseSource(tagged, larger(), true)).toBe(false);
  });
});
