# ZipPix - Privacy-First Image Compression PWA

<p align="center">
  <img src="public/icon_512.png" alt="ZipPix Logo" width="128" height="128">
</p>

ZipPix is a modern, privacy-focused image compression and editing tool built with React, TypeScript, and Vite. It runs entirely in your browser using Web Workers, ensuring that **your images never leave your device**.

## ✨ Features

### Core Features

- **🔒 Privacy First** - 100% client-side processing. No server uploads.
- **🖼️ Modern Formats** - Support for WebP, AVIF, PNG, and JPEG output.
- **📐 High-Quality Resizing** - Lanczos3 interpolation via `pica` for sharp scaling.
- **⚡ Smart Presets** - Quick options for Web, Print, Archive, and Max Compression.
- **🔍 Live Comparison** - Interactive split-slider to compare original vs. compressed.
- **🗑️ Metadata Stripping** - Automatically removes EXIF/IPTC/XMP for privacy.

### Image Editing (Non-Destructive)

- **✂️ Crop** - Freeform and aspect ratio presets (1:1, 16:9, 4:5, etc.)
- **🔄 Rotate & Flip** - 90° rotation and horizontal/vertical flip
- **🎨 Filters** - Brightness, contrast, and saturation adjustments
- **↩️ Reset to Original** - Instantly revert all edits

### Batch Processing

- **📦 Up to 20 Images** - Process multiple images at once
- **🏷️ Rename Outputs** - Edit filenames before download
- **📥 ZIP Download** - Download all compressed images as a single ZIP file
- **📊 Progress Tracking** - Per-image status and format conversion display

### PWA & Offline

- **📱 Installable** - Works as a standalone app on desktop and mobile
- **✈️ Offline Support** - Fully functional without internet connection

## 🛠️ Tech Stack

| Category         | Technology                      |
| ---------------- | ------------------------------- |
| Framework        | React 19 + TypeScript           |
| Build Tool       | Vite                            |
| Styling          | Tailwind CSS v4                 |
| UI Components    | Shadcn UI (Radix Primitives)    |
| State Management | Zustand                         |
| Image Processing | Canvas API + Pica + Web Workers |
| Cropping         | react-image-crop                |
| ZIP Generation   | JSZip                           |
| Icons            | Lucide React                    |
| Routing          | React Router DOM (HashRouter)   |

## 🚀 Getting Started

### Prerequisites

- Node.js 19+
- Bun (recommended) or npm/pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/IfanRamza/ZipPix.git
cd ZipPix

# Install dependencies
bun install

# Start development server
bun dev
```

Open http://localhost:5173 in your browser.

## 🏗️ Building for Production

```bash
bun run build   # Build for production
bun run preview # Preview the production build
```

The output will be in the `dist/` directory.

## 🧪 Running Tests

```bash
# Unit Tests (Bun Test)
bun test

# E2E Tests (Playwright)
npx playwright test
```

## 📁 Project Structure

```
src/
├── components/     # UI components (Navbar, ControlPanel, etc.)
├── hooks/          # Custom React hooks
├── lib/            # Utilities (imageProcessor, metadataParser)
├── pages/          # Route pages (HomePage, BatchPage)
├── store/          # Zustand state management
├── workers/        # Web Workers for compression
└── types/          # TypeScript type definitions
```

## 🗺️ Roadmap

### ✅ Completed

- [x] Single image compression
- [x] Format conversion (WebP, AVIF, PNG, JPEG)
- [x] Image editing (crop, rotate, flip, filters)
- [x] Non-destructive editing
- [x] Batch processing (up to 20 images)
- [x] Metadata viewer & stripping
- [x] PWA with offline support

### 🔮 Future Enhancements

- [ ] Browser extension

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🔒 Privacy Policy

ZipPix does not collect, store, or transmit any image data. All processing is performed locally on your device within your browser's sandbox.

---

**Built with ❤️ using React & Bun**
