# ZipPix - Local Image Compression PWA

ZipPix is a modern, privacy-focused image compression tool built with React, TypeScript, and Vite. It runs entirely in your browser using WebAssembly and Web Workers, ensuring that your images never leave your device. Inspired by Squoosh, it offers a premium, glassmorphic UI with real-time comparison.

## ✨ Features

- **Privacy First**: 100% client-side processing. No server uploads.
- **Modern Formats**: Support for WebP, AVIF, PNG, and JPEG.
- **High-Quality Resizing**: Lanczos3 interpolation (via `pica`) for sharp upscaling and downscaling.
- **Smart Presets**: Quick options for Web, Print, Archive, and Max Compression.
- **Live Comparison**: Interactive split-slider to compare original vs. compressed images.
- **Metadata Management**: Automatically strips EXIF/IPTC/XMP metadata for privacy.
- **PWA Support**: Installable on desktop and mobile, works offline.
- **Fast & Responsive**: Built with Vite and Tailwind CSS v4, optimized for performance.

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI (Radix Primitives)
- **State Management**: Zustand
- **Image Processing**: Canvas API + Pica + Web Workers
- **Icons**: Lucide React
- **Routing**: React Router DOM (HashRouter)

## 🚀 Getting Started

### Prerequisites

- Node.js 19+
- Bun (recommended) or npm/pnpm

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/zippix.git
    cd zippix
    ```

2.  **Install dependencies**

    ```bash
    bun install
    # or
    npm install
    ```

3.  **Start Development Server**

    ```bash
    bun dev
    # or
    npm run dev
    ```

4.  **Open in Browser**
    Navigate to `http://localhost:5173`

## 🏗️ Building for Production

To create a production-ready build:

```bash
bun run build
# or
npm run build
```

The output will be in the `dist/` directory. You can preview it locally:

```bash
bun run preview
# or
npm run preview
```

## 🧪 Running Tests

ZipPix includes a comprehensive test suite (Unit, Integration, E2E).

```bash
# Unit Tests (Bun Test)
bun test

# E2E Tests (Playwright)
npx playwright test
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🔒 Privacy Policy

ZipPix does not collect, store, or transmit any image data. All processing is performed locally on your device within your browser's sandbox.

---

**Built with ❤️ using React & Bun.**
