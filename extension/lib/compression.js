// ZipPix Extension - Compression Library
// Simplified version of web app compression logic

// Import pica if available (will be bundled)
let pica;

// Initialize pica
async function initPica() {
  if (!pica) {
    // Pica will be loaded via script tag in popup
    pica = window.pica ? window.pica() : null;
  }
  return pica;
}

/**
 * Compress an image
 * @param {ArrayBuffer} imageData - Raw image data
 * @param {Object} settings - Compression settings
 * @param {string} settings.format - Output format (webp, png, jpeg)
 * @param {number} settings.quality - Quality 1-100
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(imageData, settings) {
  const { format = "webp", quality = 80 } = settings;

  // Create image bitmap
  const blob = new Blob([imageData]);
  const bitmap = await createImageBitmap(blob);

  // Create canvas
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");

  // Draw image
  ctx.drawImage(bitmap, 0, 0);

  // Convert to blob
  const mimeType = getMimeType(format);
  const qualityValue = quality / 100;

  const outputBlob = await canvas.convertToBlob({
    type: mimeType,
    quality: qualityValue,
  });

  return outputBlob;
}

/**
 * Compress image with resize
 * @param {ArrayBuffer} imageData - Raw image data
 * @param {Object} settings - Compression settings
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImageWithResize(imageData, settings) {
  const {
    format = "webp",
    quality = 80,
    width,
    height,
    maintainAspectRatio = true,
  } = settings;

  // Create image bitmap
  const blob = new Blob([imageData]);
  const bitmap = await createImageBitmap(blob);

  // Calculate output dimensions
  let outputWidth = width || bitmap.width;
  let outputHeight = height || bitmap.height;

  if (maintainAspectRatio && (width || height)) {
    const aspectRatio = bitmap.width / bitmap.height;
    if (width && !height) {
      outputHeight = Math.round(width / aspectRatio);
    } else if (height && !width) {
      outputWidth = Math.round(height * aspectRatio);
    }
  }

  // Create canvas
  const canvas = new OffscreenCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext("2d");

  // Use pica for high-quality resize if available
  const picaInstance = await initPica();
  if (
    picaInstance &&
    (outputWidth !== bitmap.width || outputHeight !== bitmap.height)
  ) {
    // Create source canvas
    const srcCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const srcCtx = srcCanvas.getContext("2d");
    srcCtx.drawImage(bitmap, 0, 0);

    // Resize with pica
    await picaInstance.resize(srcCanvas, canvas, {
      quality: 3, // Lanczos3
      alpha: true,
    });
  } else {
    // Simple resize
    ctx.drawImage(bitmap, 0, 0, outputWidth, outputHeight);
  }

  // Convert to blob
  const mimeType = getMimeType(format);
  const qualityValue = quality / 100;

  const outputBlob = await canvas.convertToBlob({
    type: mimeType,
    quality: qualityValue,
  });

  return outputBlob;
}

/**
 * Get MIME type from format string
 */
function getMimeType(format) {
  const mimeTypes = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };
  return mimeTypes[format] || "image/webp";
}

/**
 * Estimate compressed size
 * @param {number} originalSize - Original file size
 * @param {string} format - Target format
 * @param {number} quality - Quality 1-100
 * @returns {number} Estimated size in bytes
 */
export function estimateCompressedSize(originalSize, format, quality) {
  // Compression ratios based on format and quality
  const baseRatios = {
    webp: 0.4,
    jpeg: 0.5,
    png: 0.8,
    avif: 0.3,
  };

  const baseRatio = baseRatios[format] || 0.5;
  const qualityFactor = quality / 100;

  // Lower quality = smaller file
  const adjustedRatio = baseRatio * (0.5 + 0.5 * qualityFactor);

  return Math.round(originalSize * adjustedRatio);
}
