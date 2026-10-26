/**
 * Re-encoding an already well-compressed file can make it *larger*. When the
 * output would not be smaller, handing back the user's own file is better,
 * but only if that keeps our promise to strip metadata. These checks read the
 * container structure directly, so they work in the worker without a parser.
 */

const ascii = (bytes: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...bytes.subarray(at, at + length));

/** APP1 (EXIF, XMP), APP13 (IPTC/Photoshop) and COM segments carry personal data */
const JPEG_PRIVATE_MARKERS = new Set([0xe1, 0xed, 0xfe]);

function jpegHasMetadata(bytes: Uint8Array): boolean {
  let i = 2; // after SOI
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return true; // malformed: assume the worst
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    // Start of scan / end of image: no header segments follow
    if (marker === 0xda || marker === 0xd9) return false;
    // Restart markers and TEM have no length field
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    if (JPEG_PRIVATE_MARKERS.has(marker)) return true;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return true;
}

/** Text chunks hold authors, comments and software; eXIf and tIME speak for themselves */
const PNG_PRIVATE_CHUNKS = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function pngHasMetadata(bytes: Uint8Array): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 8; // after signature
  while (i + 8 <= bytes.length) {
    const type = ascii(bytes, i + 4, 4);
    if (PNG_PRIVATE_CHUNKS.has(type)) return true;
    if (type === 'IEND') return false;
    i += 12 + view.getUint32(i); // length + type + data + CRC
  }
  return true;
}

function webpHasMetadata(bytes: Uint8Array): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 12; // after "RIFF" size "WEBP"
  while (i + 8 <= bytes.length) {
    const type = ascii(bytes, i, 4);
    if (type === 'EXIF' || type === 'XMP ') return true;
    const size = view.getUint32(i + 4, true);
    i += 8 + size + (size & 1); // chunks are padded to an even length
  }
  return i !== bytes.length; // truncated or malformed
}

/**
 * True when the file carries metadata that stripping would remove.
 * Formats we can't inspect (AVIF, GIF, …) are assumed to have some.
 */
export function hasPrivateMetadata(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return jpegHasMetadata(bytes);
  }
  if (mime === 'image/png' && ascii(bytes, 1, 3) === 'PNG') return pngHasMetadata(bytes);
  if (mime === 'image/webp' && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return webpHasMetadata(bytes);
  }
  return true;
}

/**
 * Should the untouched source be returned instead of the encoder's output?
 * Only when the pixels weren't changed, the format matches, re-encoding didn't
 * save anything, and the source has nothing left to strip.
 */
export async function shouldReuseSource(
  source: Blob,
  output: Blob,
  pixelsUnchanged: boolean,
): Promise<boolean> {
  if (!pixelsUnchanged || !source.type || source.type !== output.type) return false;
  if (output.size < source.size) return false;
  const bytes = new Uint8Array(await source.arrayBuffer());
  return !hasPrivateMetadata(bytes, source.type);
}
