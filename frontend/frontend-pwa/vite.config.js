import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DisasterWatch AI',
        short_name: 'DisasterWatch',
        description: 'AI-Powered Community Disaster Alert System',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'https://raw.githubusercontent.com/PoorneshGowda21/ai-disaster-alert-system/main/docs/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'https://raw.githubusercontent.com/PoorneshGowda21/ai-disaster-alert-system/main/docs/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org/,
            handler: 'NetworkFirst',
            options: { cacheName: 'geocoding-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /^https:\/\/{s}\.tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 604800 } },
          },
        ],
      },
    }),
  ],
})
