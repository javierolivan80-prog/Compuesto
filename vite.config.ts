import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // todo el contenido va dentro del bundle, así que precachear la app es precachear todos los niveles
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}'],
        navigateFallback: 'index.html',
        // el interruptor de emergencia siempre se pide a la red
        navigateFallbackDenylist: [/^\/sw-control\.json/],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Compuesto',
        short_name: 'Compuesto',
        id: '/',
        description: 'Aprende bolsa, inversión y finanzas como en un juego: 20 minutos al día.',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        background_color: '#080e16',
        theme_color: '#080e16',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
