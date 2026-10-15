import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

const walkJson = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walkJson(p) : p.endsWith('.json') ? [p] : [];
  });

/**
 * Módulo virtual con los metadatos ligeros de lecciones y bancos de salto, calculados al compilar.
 * Así la carga inicial no arrastra las lecciones completas (que van en su propio trozo, ver library.ts).
 */
function contentIndex(): Plugin {
  const id = 'virtual:content-index';
  const resolved = '\0' + id;
  return {
    name: 'compuesto-content-index',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(this: { addWatchFile: (f: string) => void }, source) {
      if (source !== resolved) return undefined;
      const lessons = walkJson('content/es/levels').map((f) => {
        this.addWatchFile(join(process.cwd(), f));
        const d = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
        return {
          id: d['id'],
          title: d['title'],
          level: d['level'],
          unit: d['unit'],
          status: d['status'],
          estimatedMinutes: d['estimatedMinutes'],
        };
      });
      const placements = walkJson('content/es/placement').map((f) => {
        this.addWatchFile(join(process.cwd(), f));
        const d = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
        return { unitId: d['unitId'], status: d['status'] };
      });
      return `export const lessons = ${JSON.stringify(lessons)};\nexport const placements = ${JSON.stringify(placements)};`;
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    contentIndex(),
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
        // la primera instalación toma el control enseguida: así los trozos que se piden después ya salen de la caché
        clientsClaim: true,
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
