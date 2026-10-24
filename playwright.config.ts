import { defineConfig } from '@playwright/test';

const launchOptions = { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined };

export default defineConfig({
  testDir: 'e2e',
  // /styleguide solo existe en desarrollo, así que hay dos servidores: build (preview) y dev.
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    // Laboratorios con el código de producción (minificado) para medir rendimiento: solo con LAB=1
    ...(process.env.LAB
      ? [
          {
            command:
              'VITE_LAB=1 npx vite build --outDir dist-lab --emptyOutDir && npx vite preview --outDir dist-lab --port 4180 --strictPort',
            url: 'http://localhost:4180',
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
          },
        ]
      : []),
  ],
  projects: [
    {
      name: 'prod',
      testMatch: [
        'app.spec.ts',
        'unit1.spec.ts',
        'placement.spec.ts',
        'screens.spec.ts',
        'pwa.spec.ts',
        'unit2.spec.ts',
        'unit3.spec.ts',
        'unit4.spec.ts',
        'unit5.spec.ts',
        'n1u1.spec.ts',
        'n1u2.spec.ts',
        'n1u3.spec.ts',
        'n1u4.spec.ts',
        'n1u5.spec.ts',
        'n1u6.spec.ts',
        'n3u1.spec.ts',
        'n3u2.spec.ts',
        'n3u3.spec.ts',
        'n3u4.spec.ts',
        'n3u5.spec.ts',
        'n3u6.spec.ts',
        'n2u1.spec.ts',
        'n2u2.spec.ts',
        'n2u3.spec.ts',
        'n2u4.spec.ts',
        'n2u5.spec.ts',
        'n2u6.spec.ts',
        'n2u7.spec.ts',
        'n4u1.spec.ts',
        'n4u2.spec.ts',
        'n4u3.spec.ts',
        'n4u4.spec.ts',
        'n4u5.spec.ts',
        'hardening.spec.ts',
        'practicar.spec.ts',
        'sesion.spec.ts',
        'juegos.spec.ts',
        'compartir.spec.ts',
        'rivales.spec.ts',
        'despliegue.spec.ts',
        'peor-caso.spec.ts',
        'mesa.spec.ts',
      ],
      use: { baseURL: 'http://localhost:4173', launchOptions },
    },
    {
      name: 'lab',
      testMatch: ['games-lab-perf.spec.ts'],
      use: { baseURL: 'http://localhost:4180', launchOptions },
    },
    {
      name: 'dev',
      testMatch: [
        'styleguide.spec.ts',
        'db.spec.ts',
        'exercises.spec.ts',
        'games-lab.spec.ts',
        'leccion-juego.spec.ts',
        'peor-caso-juegos.spec.ts',
      ],
      use: { baseURL: 'http://localhost:5174', launchOptions },
    },
  ],
});
