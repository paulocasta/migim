import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Migim — Rutinas de Gimnasio',
        short_name: 'Migim',
        description: 'Seguimiento de rutinas y métricas de progreso',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon.svg',     sizes: 'any',     type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(block-types|categories|exercises)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'migim-catalog', expiration: { maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /^\/uploads\//,
            handler: 'CacheFirst',
            options: { cacheName: 'migim-videos', expiration: { maxEntries: 60, maxAgeSeconds: 2592000 } },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
