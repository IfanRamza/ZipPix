/** ISO BMFF brands that are always HEVC-coded HEIF (i.e. HEIC) */
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
/** Generic HEIF brands, shared with AVIF: only HEIC when the file says so */
const GENERIC_BRANDS = new Set(['mif1', 'msf1']);

export const HEIC_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
];

/** Declared as HEIC by MIME type or extension (Windows often reports no type at all) */
export function isDeclaredHeic(file: File): boolean {
  return HEIC_TYPES.includes(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Major brand from an ISO BMFF `ftyp` box, or null if the bytes aren't one */
export function ftypBrand(bytes: Uint8Array): string | null {
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) {
    return null;
  }
  return String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
}

/** Compatible brands listed after the major brand and minor version (bytes 16…box size) */
export function compatibleBrands(bytes: Uint8Array): string[] {
  const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const end = Math.min(boxSize, bytes.length);
  const brands: string[] = [];
  for (let i = 16; i + 4 <= end; i += 4) {
    brands.push(String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]));
  }
  return brands;
}

export function isHeicBrand(brand: string | null): boolean {
  return !!brand && HEIC_BRANDS.has(brand);
}

/** True when the file's contents are HEIC, which browsers other than Safari can't decode */
export async function isHeicFile(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const brand = ftypBrand(bytes);
  if (isHeicBrand(brand)) return true;
  if (!brand || !GENERIC_BRANDS.has(brand)) return false;
  // Generic HEIF (e.g. libheif's own output): the compatible brands tell HEVC from AV1
  const compatible = compatibleBrands(bytes);
  if (compatible.some(isHeicBrand)) return true;
  if (compatible.includes('avif')) return false;
  return isDeclaredHeic(file);
}

/**
 * Decode HEIC to a lossless PNG so the rest of the pipeline sees a normal image.
 * The libheif build (~3 MB) is only fetched the first time a HEIC file arrives.
 */
export async function convertHeic(file: File): Promise<File> {
  const { heicTo } = await import('heic-to');
  const png = await heicTo({ blob: file, type: 'image/png' });
  return new File([png], file.name, { type: 'image/png', lastModified: file.lastModified });
}
