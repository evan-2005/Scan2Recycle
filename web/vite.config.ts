/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // The ONNX runtime (~27 MB) is too big to precache on install. Cache it the first time a scan needs it.
        // (The CLIP model files are cached separately by Transformers.js.)
        globIgnores: ['**/*.wasm'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'onnx-runtime', expiration: { maxEntries: 4 } },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Scan2Recycle',
        short_name: 'Scan2Recycle',
        description: 'Snap a photo, find the right bin, track what you recycle.',
        theme_color: '#1f4d3a',
        background_color: '#f4efe4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  worker: {
    // The CLIP worker imports Transformers.js, which needs ES-module workers.
    format: 'es',
  },
  server: {
    // Lets a phone on the same Wi-Fi open the dev server via your PC's IP.
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
