import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Repo name — used as the GitHub Pages base path (https://<user>.github.io/simple-lift/)
const REPO = 'simple-lift'

// https://vite.dev/config/
export default defineConfig({
  base: `/${REPO}/`,
  // Unit tests cover the pure logic — storage, progression engines, records.
  // jsdom gives those a real localStorage and window to talk to.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
  // Local dev only: the dev server is sometimes launched via a Windows 8.3 short path,
  // which trips Vite's fs allow-list. Disabling strict fs has no effect on builds.
  server: {
    fs: { strict: false },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Simple Lift',
        short_name: 'Simple Lift',
        description: 'Build an effective compound-lift workout program with almost no guesswork.',
        theme_color: '#101012',
        background_color: '#101012',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `/${REPO}/`,
        scope: `/${REPO}/`,
        icons: [
          // Placeholder SVG icon — replaced with proper PNG mascot icons in the branding step.
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache every built asset so the app is fully usable with no network.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        // Include the large lazy chunks (e.g. Firebase) so cloud users work offline too.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Any in-app (hash) route falls back to the cached shell when offline.
        navigateFallback: `/${REPO}/index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Keep the service worker out of dev — it interferes with HMR/tooling.
        // The production build still generates a full offline-capable PWA.
        enabled: false,
      },
    }),
  ],
})
