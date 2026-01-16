# ZipPix Chrome Extension

A browser extension for compressing images directly in Chrome.

## Features

- **Right-click menu**: Compress any image on the web
- **Popup UI**: Upload and compress images
- **Page scanner**: Find and batch compress all images on a page
- **Minimum 64×64**: Automatically filters out tiny images/icons
- **Size estimates**: See file sizes before compression

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder

## Usage

### Right-click any image

- Right-click → "Compress with ZipPix"
- Image downloads automatically

### Use the popup

1. Click the ZipPix icon in toolbar
2. Drop or select an image
3. Choose format and quality
4. Click "Compress & Download"

### Scan page for images

1. Click "Scan Page" in popup
2. Select images from the list
3. Click "Compress Selected"
4. Downloads as ZIP file

## File Structure

```
extension/
├── manifest.json          # Extension config (Manifest v3)
├── background/
│   └── service-worker.js  # Background processing
├── content/
│   └── scanner.js         # Page image scanning
├── popup/
│   ├── index.html         # Popup UI
│   ├── popup.css          # Styles
│   └── popup.js           # Logic
├── lib/
│   ├── compression.js     # Core compression
│   └── pica.min.js        # Resize library
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Publishing to Chrome Web Store

1. Create ZIP of `extension/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay one-time $5 registration fee
4. Upload ZIP and fill in listing details
5. Submit for review

## Privacy

All compression happens locally in the browser. No data is sent to any server.
