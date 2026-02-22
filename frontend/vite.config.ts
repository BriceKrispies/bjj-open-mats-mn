import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

const pwaManifest = {
  name: 'BJJ Open Mats',
  short_name: 'Open Mats',
  description: 'Find and RSVP to BJJ open mat sessions near you.',
  theme_color: '#2E7D32',
  background_color: '#121212',
  display: 'standalone',
  orientation: 'portrait',
  start_url: '/',
  scope: '/',
  icons: [
    { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
} as const;

// GitHub Pages project sites are served from /<repo-name>/.
// GITHUB_ACTIONS is set automatically to 'true' in all Actions runners.
const base = process.env.GITHUB_ACTIONS ? '/bjj-open-mats-mn/' : '/';

export default defineConfig(({ command }) => ({
  base,
  plugins: [
    solidPlugin(),
    // PWA is ONLY active during production builds.
    // In dev mode the plugin is excluded entirely so it cannot register
    // a service worker that would intercept Vite's HMR WebSocket or
    // cause "text/html MIME type" errors for module scripts.
    command === 'build' &&
      VitePWA({
        registerType: 'autoUpdate',
        manifest: pwaManifest,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}'],
          globIgnores: ['**/*.map'],
        },
      }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@core': '/src/core',
      '@ui': '/src/ui',
      '@lib': '/src/lib',
      '@modules': '/src/modules',
    },
  },

  build: {
    target: 'esnext',
  },

  server: {
    // Explicit HMR config — avoids WebSocket issues when running through
    // Bun's task runner or behind a local reverse proxy.
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    watch: {
      usePolling: false,
    },
  },
}));
