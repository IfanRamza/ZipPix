import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ZipPix",
        short_name: "ZipPix",
        description: "Privacy-first image compression",
        theme_color: "#06b6d4",
        icons: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
