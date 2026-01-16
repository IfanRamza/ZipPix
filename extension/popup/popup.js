// ZipPix Extension - Popup Script
// Handles UI interactions and messaging with service worker

import { compressImage, estimateCompressedSize } from "../lib/compression.js";

// DOM Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const previewImage = document.getElementById("previewImage");
const originalSizeEl = document.getElementById("originalSize");
const estimatedSizeEl = document.getElementById("estimatedSize");
const formatSelect = document.getElementById("format");
const qualitySlider = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const compressBtn = document.getElementById("compressBtn");
const scanBtn = document.getElementById("scanBtn");
const scanResults = document.getElementById("scanResults");
const imageCount = document.getElementById("imageCount");
const imageList = document.getElementById("imageList");
const selectAllBtn = document.getElementById("selectAllBtn");
const batchCompressBtn = document.getElementById("batchCompressBtn");
const statusEl = document.getElementById("status");

// State
let currentFile = null;
let currentArrayBuffer = null;
let pageImages = [];
let selectedImages = new Set();

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load saved settings
  const settings = await chrome.storage.local.get(["format", "quality"]);
  if (settings.format) formatSelect.value = settings.format;
  if (settings.quality) {
    qualitySlider.value = settings.quality;
    qualityValue.textContent = settings.quality;
  }
});

// Drop Zone Events
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragging");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    handleFile(file);
  }
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// Handle file upload
async function handleFile(file) {
  currentFile = file;
  currentArrayBuffer = await file.arrayBuffer();

  // Show preview
  const url = URL.createObjectURL(file);
  previewImage.src = url;
  preview.classList.remove("hidden");
  dropZone.classList.add("hidden");

  // Update sizes
  originalSizeEl.textContent = formatBytes(file.size);
  updateEstimatedSize();

  // Enable compress button
  compressBtn.disabled = false;
  setStatus("Ready to compress");
}

// Settings change handlers
formatSelect.addEventListener("change", () => {
  saveSettings();
  updateEstimatedSize();
});

qualitySlider.addEventListener("input", () => {
  qualityValue.textContent = qualitySlider.value;
});

qualitySlider.addEventListener("change", () => {
  saveSettings();
  updateEstimatedSize();
});

// Save settings to storage
function saveSettings() {
  chrome.storage.local.set({
    format: formatSelect.value,
    quality: parseInt(qualitySlider.value),
  });
}

// Update estimated size
function updateEstimatedSize() {
  if (!currentFile) return;
  const estimated = estimateCompressedSize(
    currentFile.size,
    formatSelect.value,
    parseInt(qualitySlider.value)
  );
  estimatedSizeEl.textContent = formatBytes(estimated);
}

// Compress button click
compressBtn.addEventListener("click", async () => {
  if (!currentArrayBuffer) return;

  setStatus("Compressing...");
  compressBtn.disabled = true;

  try {
    const settings = {
      format: formatSelect.value,
      quality: parseInt(qualitySlider.value),
    };

    const compressedBlob = await compressImage(currentArrayBuffer, settings);

    // Download
    const filename = `${currentFile.name.replace(/\.[^/.]+$/, "")}_compressed.${
      settings.format
    }`;
    downloadBlob(compressedBlob, filename);

    setStatus(
      `Done! Saved ${formatBytes(currentFile.size - compressedBlob.size)}`
    );
  } catch (error) {
    setStatus("Error: " + error.message);
  } finally {
    compressBtn.disabled = false;
  }
});

// Scan page button click
scanBtn.addEventListener("click", async () => {
  setStatus("Scanning page...");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "SCAN_PAGE",
    });

    if (response && response.images) {
      pageImages = response.images;
      showScanResults(response.images);
      setStatus(`Found ${response.images.length} images`);
    } else {
      setStatus("No images found");
    }
  } catch (error) {
    setStatus("Error scanning page");
    console.error(error);
  }
});

// Show scan results
function showScanResults(images) {
  imageCount.textContent = images.length;
  imageList.innerHTML = "";
  selectedImages.clear();

  images.forEach((img, index) => {
    const item = document.createElement("div");
    item.className = "image-item";
    item.innerHTML = `
      <input type="checkbox" data-index="${index}">
      <img src="${
        img.src
      }" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23333%22 width=%2240%22 height=%2240%22/></svg>'">
      <div class="image-item-info">
        <div class="image-item-name">${getFilename(img.src)}</div>
        <div class="image-item-meta">${img.width}×${img.height} • ${
      img.estimatedSizeText
    }</div>
      </div>
    `;

    const checkbox = item.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedImages.add(index);
        item.classList.add("selected");
      } else {
        selectedImages.delete(index);
        item.classList.remove("selected");
      }
      updateBatchButton();
    });

    item.addEventListener("click", (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      }
    });

    imageList.appendChild(item);
  });

  scanResults.classList.remove("hidden");
}

// Select all button
selectAllBtn.addEventListener("click", () => {
  const allSelected = selectedImages.size === pageImages.length;
  const checkboxes = imageList.querySelectorAll("input[type='checkbox']");

  checkboxes.forEach((cb, index) => {
    cb.checked = !allSelected;
    const item = cb.closest(".image-item");
    if (!allSelected) {
      selectedImages.add(index);
      item.classList.add("selected");
    } else {
      selectedImages.delete(index);
      item.classList.remove("selected");
    }
  });

  updateBatchButton();
  selectAllBtn.textContent = allSelected ? "Select All" : "Deselect All";
});

// Update batch button state
function updateBatchButton() {
  batchCompressBtn.disabled = selectedImages.size === 0;
  batchCompressBtn.innerHTML = `
    <span class="btn-icon">📦</span>
    Compress ${selectedImages.size} Selected
  `;
}

// Batch compress button
batchCompressBtn.addEventListener("click", async () => {
  if (selectedImages.size === 0) return;

  setStatus("Compressing images...");
  batchCompressBtn.disabled = true;

  const settings = {
    format: formatSelect.value,
    quality: parseInt(qualitySlider.value),
  };

  const selectedList = Array.from(selectedImages).map((i) => pageImages[i]);

  try {
    // Use JSZip to create archive
    const JSZip = (
      await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")
    ).default;
    const zip = new JSZip();

    let completed = 0;
    for (const img of selectedList) {
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const compressedBlob = await compressImage(arrayBuffer, settings);
        const filename = `${getFilename(img.src).replace(/\.[^/.]+$/, "")}.${
          settings.format
        }`;
        zip.file(filename, compressedBlob);

        completed++;
        setStatus(`Compressing ${completed}/${selectedList.length}...`);
      } catch (error) {
        console.error("Failed to compress:", img.src, error);
      }
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `zippix_batch_${Date.now()}.zip`);

    setStatus(`Done! ${completed} images compressed`);
  } catch (error) {
    setStatus("Error: " + error.message);
  } finally {
    batchCompressBtn.disabled = false;
    updateBatchButton();
  }
});

// Utility functions
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() || "image";
  } catch {
    return url.split("/").pop()?.split("?")[0] || "image";
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setStatus(text) {
  statusEl.textContent = text;
}
