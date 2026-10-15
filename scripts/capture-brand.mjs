// Captura #brand de la app en desarrollo en los 7 temas. Uso: node scripts/capture-brand.mjs <url> <dir>
import { chromium } from '@playwright/test';

const [url, dir] = process.argv.slice(2);
const themes = ['noche', 'mayfair', 'salmon', 'ginebra', 'montecarlo', 'tokio', 'platino'];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 820, height: 640 } });
await page.goto(`${url}/#brand`);
for (const t of themes) {
  await page.evaluate((id) => (document.documentElement.dataset.theme = id), t);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${dir}/brand-${t}.png` });
}
await browser.close();
