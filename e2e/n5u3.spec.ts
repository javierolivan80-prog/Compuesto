import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { playGameLesson, type GameLesson } from './play-game';
import { completeOnboarding } from './solver';

/* Unidad 3 del Nivel 5, planta 4 (Ventas en corto y préstamo de valores) jugada entera contra la build de producción. */

const lessons: (Lesson & { game?: GameLesson['game'] })[] = [1, 2, 3, 4, 5, 6].map((n) =>
  JSON.parse(readFileSync(`content/es/levels/n5/u3/l${n}.json`, 'utf8')),
);

test('se completa la Unidad 3 del Nivel 5 entera y queda completada en el Camino', async ({
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
    if (l.game) await playGameLesson(page, l as GameLesson);
    else {
      // el Jefe final no tiene teoría: empieza directamente por los ejercicios
      if ((l as { intro?: unknown[] }).intro?.length)
        await expect(page.getByRole('heading', { name: l.title })).toBeVisible();
      await playLesson(page, l);
    }
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page.getByTestId('xp-total')).toBeVisible();
  }

  await page.goto('/#/camino');
  await page.reload();
  const floor = page.locator('details', { hasText: 'Trading y microestructura' }).first();
  // la planta sale plegada si ya está completada: se despliega para ver la unidad
  if (!(await floor.evaluate((d) => (d as HTMLDetailsElement).open)))
    await floor.locator('summary').first().click();
  await expect(
    page.getByRole('group', { name: /Ventas en corto y préstamo de valores/ }),
  ).toContainText('✓ Completada');
  expect(errors).toEqual([]);
});
