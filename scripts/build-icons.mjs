// Genera los iconos PWA a su tamaño exacto desde assets/brand/*.svg con el Chromium de Playwright.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const targets = [
  ['icon.svg', 'public/icon-192.png', 192],
  ['icon.svg', 'public/icon-512.png', 512],
  ['icon.svg', 'public/apple-touch-icon.png', 180],
  ['icon.svg', 'public/favicon-32.png', 32],
  ['icon-maskable.svg', 'public/icon-maskable-512.png', 512],
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
for (const [src, out, size] of targets) {
  const svg = readFileSync(`assets/brand/${src}`, 'utf8');
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  writeFileSync(out, await page.screenshot({ omitBackground: true }));
  await page.close();
  console.log(`${out} ${size}x${size}`);
}
await browser.close();
