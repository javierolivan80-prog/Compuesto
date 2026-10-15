import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { completeOnboarding } from './solver';

/* Tarea 2.2: sesión "Abrir mercado" completa y reanudada, contra la build de producción. */

const lesson = (n: number): Lesson =>
  JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8'));

test('sesión de 5 min: lección, cierre y misiones sin presionar', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Misiones de hoy' })).toBeVisible();
  await page.getByRole('button', { name: 'Sesión de 20 min' }).click();
  await page.getByRole('button', { name: '5 min', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir sesión de 5 min' }).click();
  await playLesson(page, lesson(1));
  await page.getByRole('button', { name: 'Siguiente bloque' }).click();
  await expect(page.getByRole('heading', { name: 'Cierre de mercado' })).toBeVisible();
  await expect(page.getByTestId('session-xp')).toContainText('XP');
  await page.getByRole('button', { name: 'Cerrar mercado' }).click();
  await expect(page.getByTestId('xp-total')).not.toHaveText('0');
  // cerrada: ya no hay nada que reanudar
  await expect(page.getByRole('button', { name: 'Reanudar sesión' })).toHaveCount(0);
});

test('sesión interrumpida: Inicio ofrece reanudarla en el bloque pendiente', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/sesion');
  await page.getByRole('button', { name: '5 min', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir sesión de 5 min' }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.goto('/#/');
  await page.reload();
  await page.getByRole('button', { name: 'Reanudar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible();
  await playLesson(page, lesson(1));
  await page.getByRole('button', { name: 'Siguiente bloque' }).click();
  await expect(page.getByRole('heading', { name: 'Cierre de mercado' })).toBeVisible();
});
