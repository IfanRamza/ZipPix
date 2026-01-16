// ZipPix Extension - Service Worker
// Handles context menu, compression, and downloads

import { compressImage } from "../lib/compression.js";

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "zippix-compress",
    title: "Compress with ZipPix",
    contexts: ["image"],
  });

  // Set default settings
  chrome.storage.local.get(["format", "quality"], (result) => {
    if (!result.format) {
      chrome.storage.local.set({ format: "webp", quality: 80 });
    }
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "zippix-compress" && info.srcUrl) {
    try {
      // Get current settings
      const settings = await chrome.storage.local.get(["format", "quality"]);
      const format = settings.format || "webp";
      const quality = settings.quality || 80;

      // Fetch the image
      const response = await fetch(info.srcUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Compress the image
      const compressedBlob = await compressImage(arrayBuffer, {
        format,
        quality,
      });

      // Generate filename
      const originalName =
        info.srcUrl.split("/").pop()?.split("?")[0] || "image";
      const baseName = originalName.replace(/\.[^/.]+$/, "");
      const filename = `${baseName}_compressed.${format}`;

      // Download the compressed image
      const url = URL.createObjectURL(compressedBlob);
      await chrome.downloads.download({
        url,
        filename,
        saveAs: false,
      });

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("ZipPix compression failed:", error);
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COMPRESS") {
    handleCompression(message.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "BATCH_COMPRESS") {
    handleBatchCompression(message.images, message.settings)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get(["format", "quality"], sendResponse);
    return true;
  }

  if (message.type === "SAVE_SETTINGS") {
    chrome.storage.local.set(message.settings, () =>
      sendResponse({ success: true })
    );
    return true;
  }
});

// Compress a single image
async function handleCompression(data) {
  const { imageData, settings } = data;
  const compressedBlob = await compressImage(imageData, settings);
  return {
    blob: compressedBlob,
    size: compressedBlob.size,
  };
}

// Batch compress multiple images
async function handleBatchCompression(images, settings) {
  const results = [];

  for (const image of images) {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const compressedBlob = await compressImage(arrayBuffer, settings);
      results.push({
        src: image.src,
        originalSize: image.size,
        compressedBlob,
        compressedSize: compressedBlob.size,
        success: true,
      });
    } catch (error) {
      results.push({
        src: image.src,
        error: error.message,
        success: false,
      });
    }
  }

  return results;
}
