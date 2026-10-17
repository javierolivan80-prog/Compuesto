import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/* Tarea 2.4: rendimiento del kit con el código de producción (npm run e2e:lab). */

test('60 fps con la CPU ralentizada 4× (traza adjunta en docs/trazas)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/games-lab');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    (window as unknown as { __frames: number[] }).__frames = [];
    let last = 0;
    const loop = (t: number) => {
      if (last) (window as unknown as { __frames: number[] }).__frames.push(t - last);
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  // estrés dentro de la página (sin viajes de Playwright, que ensuciarían la medida): ticker corriendo,
  // estallido de partículas y acierto cada 120 ms durante 3 s
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const btn = (name: string) =>
          [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)!;
        const t0 = performance.now();
        const id = setInterval(() => {
          btn('Récord (partículas)').click();
          btn('Acierto').click();
          if (performance.now() - t0 > 3000) {
            clearInterval(id);
            done();
          }
        }, 120);
      }),
  );
  const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames);
  const sorted = [...frames].sort((a, b) => a - b);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const summary = {
    fecha: new Date().toISOString().slice(0, 10),
    escenario:
      'ticker + partículas (≤40 cada 120 ms) + pops + combo, CPU 4×, Chromium sin cabeza (render por software)',
    fotogramas: frames.length,
    fps_medio: Math.round((1000 / avg) * 10) / 10,
    p95_ms: sorted[Math.floor(sorted.length * 0.95)],
    max_ms: sorted.at(-1),
  };
  writeFileSync('docs/trazas/game-kit-fps.json', JSON.stringify(summary, null, 2) + '\n');
  expect(summary.fps_medio).toBeGreaterThanOrEqual(55);
});
