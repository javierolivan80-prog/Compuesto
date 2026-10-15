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
  ],
  projects: [
    {
      name: 'prod',
      testMatch: ['app.spec.ts', 'unit1.spec.ts', 'placement.spec.ts'],
      use: { baseURL: 'http://localhost:4173', launchOptions },
    },
    {
      name: 'dev',
      testMatch: ['styleguide.spec.ts', 'db.spec.ts', 'exercises.spec.ts'],
      use: { baseURL: 'http://localhost:5174', launchOptions },
    },
  ],
});
