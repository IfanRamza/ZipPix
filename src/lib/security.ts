/**
 * Security utilities for file validation and sanitization
 */

/**
 * Magic bytes signatures for supported image formats
 */
const SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38], // GIF8
  webp: [
    // RIFF....WEBP
    // 0-3: RIFF (52 49 46 46)
    // 8-11: WEBP (57 45 42 50)
  ],
};

/**
 * Validate file signature (magic bytes) against expected format
 * This prevents file extension spoofing (e.g., malware.exe renamed to image.jpg)
 */
export async function validateFileSignature(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check JPEG
  if (
    bytes[0] === SIGNATURES.jpeg[0] &&
    bytes[1] === SIGNATURES.jpeg[1] &&
    bytes[2] === SIGNATURES.jpeg[2]
  ) {
    return true;
  }

  // Check PNG
  if (
    bytes[0] === SIGNATURES.png[0] &&
    bytes[1] === SIGNATURES.png[1] &&
    bytes[2] === SIGNATURES.png[2] &&
    bytes[3] === SIGNATURES.png[3] &&
    bytes[4] === SIGNATURES.png[4] &&
    bytes[5] === SIGNATURES.png[5] &&
    bytes[6] === SIGNATURES.png[6] &&
    bytes[7] === SIGNATURES.png[7]
  ) {
    return true;
  }

  // Check GIF (GIF87a or GIF89a)
  if (
    bytes[0] === SIGNATURES.gif[0] &&
    bytes[1] === SIGNATURES.gif[1] &&
    bytes[2] === SIGNATURES.gif[2] &&
    bytes[3] === SIGNATURES.gif[3] &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && // '7' or '9'
    bytes[5] === 0x61 // 'a'
  ) {
    return true;
  }

  // Check WebP (RIFF....WEBP)
  // RIFF: 52 49 46 46 (0-3)
  // WEBP: 57 45 42 50 (8-11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  // Check AVIF (ftypavif at offset 4 usually)
  // 4-7: ftyp (66 74 79 70)
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return true;
  }

  return false;
}

/**
 * Strict filename sanitization to prevent path traversal and XSS
 */
export function strictSanitizeFilename(filename: string): string {
  // 1. Remove any path directory components
  let name = filename.replace(/^.*[\\/]/, "");

  // 2. Decode URI components to catch encoded attacks (e.g. %2e%2e/)
  try {
    name = decodeURIComponent(name);
  } catch (e) {
    // Ignore invalid encoding
    console.error("Invalid encoding", e);
  }

  // 3. Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1f\x7f]/g, "");

  // 4. Remove potentially dangerous scripts/html tags
  name = name.replace(/<[^>]*>/g, "");

  // 5. Remove path traversal patterns
  name = name.replace(/\.\./g, "");

  // 6. Split extension
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;

  // 7. Whitelist allowed characters for basename (alphanumeric, space, dash, underscore, dot)
  const safeBase = base
    .replace(/[^a-zA-Z0-9 \-_.]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  // 8. Limit length and ensure not empty
  const finalBase = safeBase.slice(0, 50) || "untitled";

  // 9. Prevent reserved filenames (Windows)
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(finalBase)) {
    return `_${finalBase}`;
  }

  return ext ? `${finalBase}.${ext}` : finalBase;
}
