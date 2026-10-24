export const MIN_PALETTE_COLORS = 2;
export const MAX_PALETTE_COLORS = 256;

/**
 * Reduce an image to at most `colors` colours (alpha included), like pngquant.
 * OxiPNG then stores it as an indexed PNG, which is typically 70–85% smaller.
 *
 * UPNG's k-d tree quantizer is MIT licensed and ~30x faster than the pure-JS
 * alternatives (libimagequant is GPL). It does not dither, so smooth photo
 * gradients can band; screenshots and graphics look the same.
 */
export async function reducePalette(pixels: ImageData, colors: number): Promise<ImageData> {
  const { default: UPNG } = await import('upng-js');
  const [buffer] = UPNG.quantize([pixels.data.buffer as ArrayBuffer], colors).bufs;
  return new ImageData(new Uint8ClampedArray(buffer), pixels.width, pixels.height);
}
