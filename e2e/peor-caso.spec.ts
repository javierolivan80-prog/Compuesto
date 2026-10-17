import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './solver';

/* Tarea 2.8 (break-ui): el peor caso realista entra por la misma frontera que los datos reales (una copia
   importada) y recorre las pantallas nuevas de la Fase 2 a 320 px. Las capturas quedan en docs/capturas/2.8. */

const ev = (type: string, payload: object, createdAt: string) => ({
  id: randomUUID(),
  type,
  createdAt,
  deviceId: 'test',
  schemaVersion: 1,
  tz: 'Europe/Madrid',
  payload,
});

/** 400 días seguidos con mucho XP, iniciales anchas de 6 letras, conceptos de nombre largo fallados y sesiones de 60 min. */
function worstCase(): string {
  const day0 = Date.now() - 400 * 86_400_000;
  const events = [
    ev('settings_changed', { key: 'onboarded', value: true }, new Date(day0).toISOString()),
    ev(
      'settings_changed',
      { key: 'tickerInitials', value: 'WMWMWM' },
      new Date(day0).toISOString(),
    ),
  ];
  for (let d = 0; d < 400; d++) {
    const at = (m: number) => new Date(Date.now() - d * 86_400_000 - m * 60_000).toISOString();
    events.push(ev('lesson_completed', { lessonId: 'n0-u1-l1', xp: 380, accuracy: 0.33 }, at(30)));
    if (d < 20) {
      const sid = randomUUID();
      events.push(
        ev(
          'session_started',
          {
            sessionId: sid,
            day: at(200).slice(0, 10),
            minutes: 20,
            blocks: [{ kind: 'briefing' }],
          },
          at(200),
        ),
        ev('session_completed', { sessionId: sid }, at(120)),
      );
      for (const [i, c] of ['fiscalidad-avanzada', 'ma-completo', 'valoracion-sectores'].entries())
        events.push(
          ev(
            'exercise_answered',
            {
              exerciseId: `n0-u1-l1-e${i + 1}`,
              lessonId: 'n0-u1-l1',
              conceptIds: [c],
              correct: d % 3 === 0,
              timeMs: 4000,
              xp: 0,
              source: 'lesson',
            },
            at(60 + i),
          ),
        );
    }
  }
  return JSON.stringify({
    format: 'compuesto-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    content_reports: [],
  });
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('peor caso a 320 px: Inicio, Rivales, Despacho y Compartir sin desbordar', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 720 });
  await completeOnboarding(page);
  await page.goto('/#/despacho/ajustes');
  await page.setInputFiles('input[type="file"]', {
    name: 'peor.json',
    mimeType: 'application/json',
    buffer: Buffer.from(worstCase()),
  });
  await page.getByRole('button', { name: 'Reemplazar mi progreso' }).click();
  await expect(page.getByText('Copia importada.')).toBeVisible({ timeout: 90_000 });
  mkdirSync('docs/capturas/2.8', { recursive: true });
  for (const [hash, name] of [
    ['/#/', 'inicio'],
    ['/#/rivales', 'rivales'],
    ['/#/despacho', 'despacho'],
    ['/#/despacho/compartir', 'compartir'],
  ] as const) {
    await page.goto(hash);
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `docs/capturas/2.8/peor-caso-${name}-320.png`, fullPage: true });
    expect(await overflow(page), `${name}: desbordamiento horizontal`).toBeLessThanOrEqual(0);
  }
  // ritmo alto pero constante: la liga se adapta a tu media, así que asciendes al principio y luego te estabilizas
  await page.goto('/#/rivales');
  await expect(page.getByTestId('division')).toContainText(/División (Plata|Oro|Platino)/);
  await expect(page.getByTestId('weekly-close')).toBeVisible();
  // conceptos de nombre largo listados enteros (sin truncar)
  await page.goto('/#/despacho');
  await expect(page.getByText('Fiscalidad avanzada (720/721, doble imposición)')).toBeVisible();
  // tu acción se describe en puntos, nunca en euros ni como «datos de ejemplo»
  const stock = page.getByTestId('my-stock');
  await expect(stock).toContainText('puntos');
  await expect(stock).not.toContainText('€');
  await expect(stock).not.toContainText('Datos de ejemplo');
  // el precio nunca se parte por la mitad: una sola línea
  const price = page.getByTestId('stock-price');
  const box = await price.boundingBox();
  const lh = await price.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  expect(box!.height).toBeLessThanOrEqual(lh * 1.2);
  // la tarjeta con Leyenda, racha de 400 y XP de seis cifras
  await page.goto('/#/despacho/compartir');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Descargar PNG' }).click(),
  ]);
  await download.saveAs('docs/capturas/2.8/peor-caso-tarjeta.png');
});
