import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * @imgly/background-removal points onnxruntime at WASM files on its own CDN,
 * so the 24 MB copies Vite emits from onnxruntime-web are never requested.
 */
function dropUnusedOnnxWasm(): Plugin {
  return {
    name: 'drop-unused-onnx-wasm',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const name of Object.keys(bundle)) {
        if (/ort-wasm[^/]*\.wasm$/.test(name)) delete bundle[name];
      }
    },
  };
}

export default defineConfig({
  // The compression worker lazy-loads the AVIF encoder, which needs code splitting
  worker: { format: 'es' },
  // jsquash resolves its .wasm via import.meta.url; pre-bundling would break that path
  optimizeDeps: { exclude: ['@jsquash/avif'] },
  plugins: [
    react(),
    dropUnusedOnnxWasm(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ZipPix - Image Compression',
        short_name: 'ZipPix',
        description:
          'Privacy-first, client-side image compression. Compress images without uploading to any server.',
        theme_color: '#5b3df5',
        background_color: '#f6f6fa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['utilities', 'productivity', 'photos'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,png}'],
        // ONNX runtime (~800 KB) and the AVIF encoder are only needed on demand
        globIgnores: ['**/ort*.{js,mjs}', '**/avif_enc*.js', '**/*.wasm', '**/icon-*512.png'],
      },
      devOptions: {
        enabled: false, // Disable in dev mode
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
});
