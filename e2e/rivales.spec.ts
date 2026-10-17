import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addDays } from '../src/engine/days';
import { weekStart } from '../src/engine/session';
import { todayKey } from '../src/engine/stats';
import { completeOnboarding } from './solver';

/* Tarea 2.7: liga semanal contra rivales simulados, cierre semanal y estadísticas personales. */

const ev = (type: string, payload: object, createdAt: string) => ({
  id: randomUUID(),
  type,
  createdAt,
  deviceId: 'test',
  schemaVersion: 1,
  tz: 'Europe/Madrid',
  payload,
});

/** Copia con 90 XP cada día de la semana pasada (para que el cierre de ayer sea un ascenso). */
function backupLastWeek(xpPerDay: number): string {
  const lastMonday = addDays(weekStart(todayKey(new Date())), -7);
  const events = [
    ev('settings_changed', { key: 'onboarded', value: true }, `${lastMonday}T08:00:00.000Z`),
    ev('settings_changed', { key: 'tickerInitials', value: 'JAV' }, `${lastMonday}T08:00:00.000Z`),
    ...Array.from({ length: 7 }, (_, i) =>
      ev(
        'lesson_completed',
        { lessonId: 'n0-u1-l1', xp: xpPerDay, accuracy: 1 },
        `${addDays(lastMonday, i)}T11:00:00.000Z`,
      ),
    ),
  ];
  return JSON.stringify({
    format: 'compuesto-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    content_reports: [],
  });
}

async function importBackup(page: Page, json: string) {
  await completeOnboarding(page);
  await page.goto('/#/despacho/ajustes');
  await page.setInputFiles('input[type="file"]', {
    name: 'copia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await page.getByRole('button', { name: 'Reemplazar mi progreso' }).click();
  await expect(page.getByText('Copia importada.')).toBeVisible({ timeout: 30_000 });
}

test('sin XP no hay liga inventada', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/#/rivales');
  await expect(page.getByRole('heading', { name: 'Rivales', level: 1 })).toBeVisible();
  await expect(page.getByText('arranca con tu primer XP')).toBeVisible();
  await expect(page.getByTestId('rival-row')).toHaveCount(0);
});

test('cierre semanal simulado: asciende de Bronce a Plata y la clasificación se reordena', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await importBackup(page, backupLastWeek(90));
  await page.goto('/#/rivales');
  await page.reload();
  // la semana pasada: 630 XP, primero; la liga ya está en Plata
  await expect(page.getByTestId('division')).toContainText('División Plata');
  const close = page.getByTestId('weekly-close');
  await expect(close).toBeVisible();
  await expect(page.getByTestId('close-result')).toContainText('Ascendes a Plata');
  await expect(page.getByTestId('close-result')).toContainText('1.º');
  // clasificación de la semana en curso: 8 rivales + tú, con ▲▼ y texto (no solo color)
  const stand = page.getByRole('list', { name: /^Clasificación de Plata/ });
  await expect(stand.getByRole('listitem')).toHaveCount(9);
  await expect(page.getByTestId('vs-last-week')).toContainText('tu yo de la semana pasada');
  await expect(page.getByTestId('vs-last-week')).toContainText('detrás');
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

test('estadísticas personales: sesiones, minutos y conceptos en Despacho; sin desborde a 375 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await importBackup(page, backupLastWeek(40));
  await page.goto('/#/despacho');
  await page.reload();
  await expect(page.getByText('Sesiones completadas')).toBeVisible();
  await expect(page.getByText('Minutos por sesión')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conceptos por reforzar' })).toBeVisible();
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(over).toBeLessThanOrEqual(0);
  await page.goto('/#/rivales');
  await page.reload();
  const over2 = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(over2).toBeLessThanOrEqual(0);
});
