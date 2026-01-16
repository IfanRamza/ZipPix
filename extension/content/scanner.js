// ZipPix Extension - Content Script
// Scans page for images and sends to popup

const MIN_IMAGE_SIZE = 64; // Minimum dimension to include

// Listen for scan requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_PAGE") {
    const images = scanPageImages();
    sendResponse({ images });
    return true;
  }
});

// Scan page for all images above minimum size
function scanPageImages() {
  const images = [];
  const seen = new Set();

  // Get all img elements
  document.querySelectorAll("img").forEach((img) => {
    const src = img.src || img.currentSrc;
    if (!src || seen.has(src)) return;

    // Skip data URLs that are too small (likely tracking pixels)
    if (src.startsWith("data:") && src.length < 1000) return;

    // Get natural dimensions
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    // Skip images below minimum size
    if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) return;

    // Estimate file size (rough estimate based on dimensions and format)
    const estimatedSize = estimateFileSize(src, width, height);

    seen.add(src);
    images.push({
      src,
      width,
      height,
      alt: img.alt || "",
      estimatedSize,
      estimatedSizeText: formatBytes(estimatedSize),
    });
  });

  // Also check background images in CSS
  document.querySelectorAll("*").forEach((el) => {
    const style = window.getComputedStyle(el);
    const bgImage = style.backgroundImage;

    if (bgImage && bgImage !== "none") {
      const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1] && !seen.has(match[1])) {
        const src = match[1];

        // Skip data URLs and small ones
        if (src.startsWith("data:") && src.length < 1000) return;

        seen.add(src);
        images.push({
          src,
          width: 0, // Unknown for background images
          height: 0,
          alt: "Background image",
          estimatedSize: 0,
          estimatedSizeText: "Unknown",
          isBackground: true,
        });
      }
    }
  });

  return images;
}

// Estimate file size based on dimensions and format
function estimateFileSize(src, width, height) {
  // If it's a data URL, we can get exact size
  if (src.startsWith("data:")) {
    const base64 = src.split(",")[1];
    if (base64) {
      return Math.round((base64.length * 3) / 4);
    }
  }

  // Rough estimate based on dimensions and typical compression
  // Assume 3 bytes per pixel, then apply format-based compression ratio
  const rawSize = width * height * 3;

  // Detect format from URL
  const ext = src.split(".").pop()?.toLowerCase().split("?")[0];

  const compressionRatios = {
    png: 0.5,
    jpg: 0.1,
    jpeg: 0.1,
    webp: 0.08,
    gif: 0.3,
    avif: 0.06,
  };

  const ratio = compressionRatios[ext] || 0.15;
  return Math.round(rawSize * ratio);
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
