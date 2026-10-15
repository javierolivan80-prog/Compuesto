import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { completeOnboarding } from './solver';

/* Unidad 3 del Nivel 1 del Nivel 0 (Bolsas e índices) jugada entera contra la build de producción. */

const lessons: Lesson[] = [1, 2, 3, 4, 5].map((n) =>
  JSON.parse(readFileSync(`content/es/levels/n1/u3/l${n}.json`, 'utf8')),
);

test('se completa la Unidad 3 del Nivel 1 entera y queda completada en el Camino', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await completeOnboarding(page);

  for (const l of lessons) {
    await page.goto(`/#/leccion/${l.id}`);
    await page.reload();
    await expect(page.getByRole('heading', { name: l.title })).toBeVisible();
    await playLesson(page, l);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByTestId('xp-total')).toBeVisible();
  }

  await page.goto('/#/camino');
  await page.reload();
  await expect(page.getByRole('group', { name: /Bolsas e índices/ })).toContainText('✓ Completada');
  expect(errors).toEqual([]);
});
