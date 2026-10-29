import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { completeOnboarding } from './solver';

/* Unidad 5 del Nivel 0 (Seguros, pensiones y riesgo) jugada entera contra la build de producción. */

const lessons: Lesson[] = [1, 2, 3, 4, 5, 6].map((n) =>
  JSON.parse(readFileSync(`content/es/levels/n0/u5/l${n}.json`, 'utf8')),
);

test('se completa la Unidad 5 entera y queda completada en el Camino', async ({ page }) => {
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
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page.getByTestId('xp-total')).toBeVisible();
  }

  // el Nivel 0 es la Base opcional: su progreso se ve en Practicar, no en el Camino
  await page.goto('/#/practicar');
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'Base: el dinero' })
      .getByRole('listitem')
      .filter({ hasText: /Seguros, pensiones y riesgo/ }),
  ).toContainText(/(\d+) de \1 lecciones/);
  expect(errors).toEqual([]);
});
