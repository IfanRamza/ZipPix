import { describe, expect, test } from 'bun:test';
import { ftypBrand, isDeclaredHeic, isHeicFile } from '../src/lib/heic';
import { validateFileSignature } from '../src/lib/security';
import { validateFileType } from '../src/lib/utils';

/** An ISO BMFF `ftyp` box: size, "ftyp", major brand, minor version, compatible brands */
function ftyp(major: string, compatible: string[] = []): Uint8Array {
  const text = `ftyp${major}\0\0\0\0${compatible.join('')}`;
  const size = 4 + text.length;
  return new Uint8Array([0, 0, 0, size, ...[...text].map((c) => c.charCodeAt(0))]);
}

function fileOf(bytes: Uint8Array, name: string, type = ''): File {
  return new File([bytes], name, { type });
}

describe('HEIC detection', () => {
  test('reads the ftyp brand', () => {
    expect(ftypBrand(ftyp('heic'))).toBe('heic');
    expect(ftypBrand(new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  test('HEIC brands are HEIC regardless of name', async () => {
    expect(await isHeicFile(fileOf(ftyp('heic'), 'photo.jpg'))).toBe(true);
    expect(await isHeicFile(fileOf(ftyp('heix'), 'photo'))).toBe(true);
  });

  test('generic mif1 with a compatible HEIC brand is HEIC under any name', async () => {
    // Same header as libheif's example.heic
    expect(await isHeicFile(fileOf(ftyp('mif1', ['mif1', 'heic']), 'renamed.bin'))).toBe(true);
  });

  test('generic mif1 with a compatible AVIF brand is not HEIC, whatever the name', async () => {
    expect(await isHeicFile(fileOf(ftyp('mif1', ['mif1', 'avif']), 'photo.heic'))).toBe(false);
  });

  test('bare mif1 falls back to the declared type', async () => {
    expect(await isHeicFile(fileOf(ftyp('mif1'), 'IMG_0001.HEIC'))).toBe(true);
    expect(await isHeicFile(fileOf(ftyp('mif1'), 'photo.avif', 'image/avif'))).toBe(false);
  });

  test('AVIF is not HEIC', async () => {
    expect(await isHeicFile(fileOf(ftyp('avif'), 'photo.avif', 'image/avif'))).toBe(false);
  });

  test('HEIC passes signature and type checks, even with no MIME type', async () => {
    const file = fileOf(ftyp('heic'), 'IMG_0001.heic');
    expect(isDeclaredHeic(file)).toBe(true);
    expect(validateFileType(file)).toBe(true);
    expect(validateFileType('image/heic')).toBe(true);
    expect(await validateFileSignature(file)).toBe(true);
  });

  test('a renamed non-image is still rejected', async () => {
    const fake = new File(['MZ not an image at all'], 'evil.heic');
    expect(validateFileType(fake)).toBe(true); // extension alone gets past the cheap check…
    expect(await validateFileSignature(fake)).toBe(false); // …but not the magic bytes
  });
});
