import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CARD_FORMATS, CARD_SIZE, CARD_STYLES, pngSize } from '../src/features/share/card';
import { completeOnboarding } from './solver';

/* Tarea 2.6: la tarjeta compartible se genera en local, offline, con medidas exactas y sin dinero. */

const ev = (type: string, payload: object, createdAt: string) => ({
  id: randomUUID(),
  type,
  createdAt,
  deviceId: 'test',
  schemaVersion: 1,
  tz: 'Europe/Madrid',
  payload,
});

/** 14 días de actividad con buena precisión: la acción tiene velas y el perfil, racha. */
function backup(): string {
  const events = [
    ev(
      'settings_changed',
      { key: 'onboarded', value: true },
      new Date(Date.now() - 20 * 86_400_000).toISOString(),
    ),
    ev(
      'settings_changed',
      { key: 'tickerInitials', value: 'JAV' },
      new Date(Date.now() - 20 * 86_400_000).toISOString(),
    ),
  ];
  for (let d = 0; d < 14; d++) {
    const at = (m: number) => new Date(Date.now() - d * 86_400_000 - m * 60_000).toISOString();
    for (let i = 0; i < 8; i++)
      events.push(
        ev(
          'exercise_answered',
          {
            exerciseId: `n0-u1-l1-e${i + 1}`,
            lessonId: 'n0-u1-l1',
            conceptIds: ['inflacion'],
            correct: i !== 3 || d % 3 === 0,
            timeMs: 4000,
            xp: 10,
            source: 'lesson',
          },
          at(60 + i),
        ),
      );
    events.push(ev('lesson_completed', { lessonId: 'n0-u1-l1', xp: 20, accuracy: 0.9 }, at(30)));
  }
  return JSON.stringify({
    format: 'compuesto-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    content_reports: [],
  });
}

async function setup(page: Page) {
  await completeOnboarding(page);
  await page.goto('/#/despacho/ajustes');
  await page.setInputFiles('input[type="file"]', {
    name: 'copia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup()),
  });
  await page.getByRole('button', { name: 'Reemplazar mi progreso' }).click();
  await expect(page.getByText('Copia importada.')).toBeVisible({ timeout: 30_000 });
  await page.goto('/#/despacho/compartir');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Compartir mi progreso' })).toBeVisible();
}

async function pick(page: Page, group: string, name: string) {
  await page.getByRole('radiogroup', { name: group }).getByRole('radio', { name }).click();
}

async function downloadPng(page: Page): Promise<Buffer> {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Descargar PNG' }).click(),
  ]);
  const path = await dl.path();
  return readFileSync(path);
}

test('las 6 combinaciones (2 formatos × 3 estilos) salen con las medidas exactas', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  mkdirSync('docs/capturas/2.6', { recursive: true });
  const formatName = { story: 'Historia 1080×1920', post: 'Post 1080×1080' } as const;
  const styleName = { terminal: 'Terminal', papel: 'Papel', carreras: 'Carreras' } as const;
  for (const f of CARD_FORMATS)
    for (const s of CARD_STYLES) {
      await pick(page, 'Formato', formatName[f]);
      await pick(page, 'Estilo', styleName[s]);
      const png = await downloadPng(page);
      expect(pngSize(new Uint8Array(png)), `${f}/${s}`).toEqual(CARD_SIZE[f]);
      expect(png.length).toBeGreaterThan(20_000);
      writeFileSync(`docs/capturas/2.6/${f}-${s}.png`, png);
    }
});

test('se genera sin conexión', async ({ page, context }) => {
  test.setTimeout(120_000);
  await setup(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await context.setOffline(true);
  const png = await downloadPng(page);
  expect(pngSize(new Uint8Array(png))).toEqual(CARD_SIZE.story);
});

test('la tarjeta lleva XP y progreso, nunca dinero', async ({ page }) => {
  await setup(page);
  const text = await page.getByTestId('share-card').first().innerText();
  expect(text).not.toMatch(/€|EUR|euros?\b/i);
  expect(text).toContain('Compuesto');
  expect(text).toContain('$JAV');
  expect(text).toMatch(/XP/);
  await expect(page.getByTestId('share-preview')).toHaveAttribute(
    'aria-label',
    /racha de \d+ días/,
  );
  await expect(page.getByTestId('share-preview')).not.toHaveAttribute('aria-label', /€/);
});

test('en el móvil se comparte el archivo con la Web Share API', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: unknown };
    Object.defineProperty(Navigator.prototype, 'canShare', {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(Navigator.prototype, 'share', {
      value: async (d: { files: File[]; title: string }) => {
        w.__shared = {
          name: d.files[0]!.name,
          type: d.files[0]!.type,
          size: d.files[0]!.size,
          title: d.title,
        };
      },
      configurable: true,
    });
  });
  await setup(page);
  await page.getByRole('button', { name: 'Compartir', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shared?: unknown }).__shared))
    .toMatchObject({ type: 'image/png', title: 'Compartir mi progreso' });
});

test('en escritorio sin Web Share solo hay descarga (nada falso en pantalla)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', {
      value: undefined,
      configurable: true,
    });
  });
  await setup(page);
  await expect(page.getByRole('button', { name: 'Compartir', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descargar PNG' })).toBeVisible();
});

test('la pantalla pasa axe y no desborda a 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page);
  await page.waitForTimeout(300);
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
});

test('tu acción ($JAV) cotiza con velas en Inicio y en Despacho', async ({ page }) => {
  await setup(page);
  for (const [hash, shot] of [
    ['/#/', 'inicio-accion-375'],
    ['/#/despacho', 'despacho-accion-375'],
  ] as const) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(hash);
    await page.reload();
    const panel = page.getByTestId('my-stock');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('$JAV');
    await expect(page.getByTestId('stock-price')).toHaveText(/^\d{1,3}(\.\d{3})*,\d{2}$/);
    await expect(panel.locator('canvas').first()).toBeVisible(); // velas de lightweight-charts
    await page.screenshot({ path: `docs/capturas/2.6/${shot}.png` });
  }
});

test('sin actividad: la acción dice que empezará a cotizar y no inventa velas', async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByTestId('my-stock')).toContainText('empezará a cotizar');
  await expect(page.getByTestId('my-stock').locator('canvas')).toHaveCount(0);
});
