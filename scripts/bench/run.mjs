import { chromium } from '/home/user/Compuesto/node_modules/playwright/index.mjs';
const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const browser = await chromium.launch({
  executablePath: exe,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
for (const throttle of [1, 4])
  for (const engine of ['canvas', 'pixi']) {
    const page = await browser.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await page.goto(
      `file://${process.cwd()}/bench.html?engine=${engine}&n=${process.env.N ?? 500}`,
    );
    await page.waitForFunction(() => document.title === 'done', null, { timeout: 120000 });
    console.log(throttle + '×', JSON.stringify(await page.evaluate(() => window.__result)));
    await page.close();
  }
await browser.close();
