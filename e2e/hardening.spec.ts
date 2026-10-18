import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { playCurrentLesson } from './play-any';
import { completeOnboarding } from './solver';

/* Tarea 1.10: casos límite (break-ui) contra la build de producción. */

const noHorizontalScroll = async (page: Page, label: string) => {
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(over, `${label}: desbordamiento horizontal`).toBeLessThanOrEqual(0);
};

/** Copia de seguridad sintética con una racha de `days` días seguidos (hoy incluido). */
function backupWithStreak(days: number, xpPerDay: number): string {
  const events = [
    {
      id: randomUUID(),
      type: 'settings_changed',
      createdAt: new Date(Date.now() - days * 86_400_000).toISOString(),
      deviceId: 'test',
      schemaVersion: 1,
      tz: 'Europe/Madrid',
      payload: { key: 'onboarded', value: true },
    },
    {
      id: randomUUID(),
      type: 'settings_changed',
      createdAt: new Date(Date.now() - days * 86_400_000).toISOString(),
      deviceId: 'test',
      schemaVersion: 1,
      tz: 'Europe/Madrid',
      payload: { key: 'tickerInitials', value: 'JAV' },
    },
  ];
  for (let d = 0; d < days; d++) {
    events.push({
      id: randomUUID(),
      type: 'lesson_completed',
      createdAt: new Date(Date.now() - d * 86_400_000 - 3_600_000).toISOString(),
      deviceId: 'test',
      schemaVersion: 1,
      tz: 'Europe/Madrid',
      payload: { lessonId: 'n0-u1-l1', xp: xpPerDay, accuracy: 1 } as never,
    });
  }
  return JSON.stringify({
    format: 'compuesto-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    content_reports: [],
  });
}

test('onboarding: iniciales de 1 carácter o de 40 caracteres no dejan continuar y no rompen el diseño', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar a la oficina' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const input = page.getByLabel('Tus iniciales');
  const start = page.getByRole('button', { name: 'Empezar mi primera lección' });
  await input.fill('A');
  await expect(start).toBeDisabled();
  await input.fill('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMN'); // 40 caracteres
  expect((await input.inputValue()).length).toBeLessThanOrEqual(6);
  await expect(start).toBeDisabled();
  await noHorizontalScroll(page, 'onboarding con texto largo');
  await input.fill('JAV');
  await expect(start).toBeEnabled();
});

test('racha de 999 días y mucho XP: Inicio, Despacho y Camino sin desbordar a 375 px', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/despacho/ajustes');
  // sin onboarding previo: se importa la copia desde Ajustes pasando antes por el onboarding
  await completeOnboarding(page);
  await page.goto('/#/despacho/ajustes');
  await page.setInputFiles('input[type="file"]', {
    name: 'racha.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backupWithStreak(999, 100)),
  });
  await page.getByRole('button', { name: 'Reemplazar mi progreso' }).click();
  await expect(page.getByText('Copia importada.')).toBeVisible({ timeout: 60_000 });
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByTestId('streak')).toContainText('999');
  await expect(page.getByTestId('xp-total')).toContainText('99.900');
  await noHorizontalScroll(page, 'Inicio con racha 999');
  for (const [hash, name] of [
    ['/#/despacho', 'Despacho'],
    ['/#/camino', 'Camino'],
    ['/#/despacho/ajustes', 'Ajustes'],
  ] as const) {
    await page.goto(hash);
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await noHorizontalScroll(page, `${name} con racha 999`);
  }
});

test('racha 0: Inicio recién estrenado muestra 0 sin errores', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByTestId('xp-total')).toHaveText('0');
  await expect(page.getByTestId('streak')).toContainText('0');
});

test('almacenamiento lleno: la lección sigue, avisa del error y no se rompe', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await completeOnboarding(page);
  await page.evaluate(() => {
    // simula disco lleno: toda escritura en IndexedDB falla con QuotaExceededError
    const full = function () {
      throw new DOMException('Sin espacio', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.add = full as unknown as typeof IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.put = full as unknown as typeof IDBObjectStore.prototype.put;
  });
  await playCurrentLesson(page);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'no se pudo guardar' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('texto largo en inglés en un reporte y en el buscador del glosario no desborda', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n0-u1-l1'); // tres tarjetas de teoría antes de los ejercicios
  await page
    .getByRole('button', { name: /Siguiente/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /Siguiente/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Empezar los ejercicios' }).click();
  await page.getByRole('button', { name: /Reportar error/ }).click();
  const long =
    'This question is ambiguous because the answer depends on the definition of inflation used. '.repeat(
      20,
    ) + 'x'.repeat(300);
  await page.getByRole('textbox').last().fill(long);
  await page
    .getByRole('button', { name: /Guardar reporte|Enviar|Guardar/ })
    .last()
    .click();
  await page.goto('/#/despacho/reportes');
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await noHorizontalScroll(page, 'Reportes con texto largo');
  await page.goto('/#/despacho/glosario');
  await page.reload();
  await page.getByLabel('Buscar un término').fill('x'.repeat(200));
  await noHorizontalScroll(page, 'Glosario con búsqueda larga');
});

test('doble toque en una lección-juego: decide una sola vez y no salta pasos', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await completeOnboarding(page);

  // «El rumor de OPA»: un doble toque en «Siguiente» no cae sobre la primera opción del paso nuevo
  await page.goto('/#/leccion/n1-u6-l7');
  await page.getByRole('button', { name: /^No hacer nada/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).dblclick();
  await expect(page.getByTestId('tk-step')).toHaveText('Martes: una confidencia');
  await expect(page.getByRole('button', { name: /antes del anuncio$/ })).toBeVisible();

  // «La compra grande»: un doble toque en «Comprar … a mercado» compra una sola ronda
  await page.goto('/#/leccion/n1-u4-l7');
  await expect(page.getByTestId('bt-round')).toContainText('Ronda 1 de');
  await page.getByRole('button', { name: /^Comprar \d+ a mercado$/ }).dblclick();
  await expect(page.getByTestId('bt-round')).toContainText('Ronda 2 de');
  expect(errors).toEqual([]);
});
