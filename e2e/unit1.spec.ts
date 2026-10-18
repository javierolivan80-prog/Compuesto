import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { completeOnboarding, solve } from './solver';

/* Flujo completo de la Unidad 1 del Nivel 0 contra la build de producción:
   las respuestas salen de los propios JSON de contenido, así el test sigue valiendo si se edita una lección. */

const lessons: Lesson[] = [1, 2, 3, 4, 5].map((n) =>
  JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8')),
);
const SHOTS = 'docs/capturas/1.4';

test('se completa la Unidad 1 entera, los fallos vuelven y el progreso sobrevive a la recarga', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // el onboarding termina en la primera lección de la planta 0; la Base (nivel 0) se abre aparte
  await completeOnboarding(page);
  await page.goto('/#/leccion/n0-u1-l1');
  await expect(page.getByRole('heading', { name: lessons[0]!.title })).toBeVisible();

  // L1: el primer ejercicio se falla a propósito → vuelve al final
  const r1 = await playLesson(page, lessons[0]!, {
    wrongFirst: lessons[0]!.exercises[0]!.id,
    shots: 'l1',
    shotsDir: SHOTS,
  });
  expect(r1.answered).toBe(lessons[0]!.exercises.length + 1); // 8 + el fallo repetido
  await expect(page.getByText('88 %')).toBeVisible(); // 7/8 a la primera
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByTestId('xp-total')).toHaveText('95'); // 7×10 + 5 (repaso) + 20 (≥ 80 %)
  await expect(page.getByTestId('streak')).toHaveText('1 d');

  for (const [i, l] of lessons.slice(1).entries()) {
    // la Base, en Practicar, ofrece siempre la siguiente lección sin completar de la unidad
    await page.goto('/#/practicar');
    await page.getByRole('button', { name: /^Continuar El dinero en el tiempo/ }).click();
    await expect(page.getByRole('heading', { name: l.title })).toBeVisible();
    await playLesson(page, l, i === 0 ? { shots: 'l2', shotsDir: SHOTS } : {});
    // la última lección cruza los 500 XP: sube de rango y el cierre lo celebra
    if (i === lessons.length - 2)
      await expect(
        page.getByRole('region', { name: 'Subida de rango: Analista Junior' }),
      ).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
  }

  // 95 + 110 (l2, 9 ejercicios) + 110 (l3, 9) + 100 + 120
  await expect(page.getByTestId('xp-total')).toHaveText('535');
  await expect(page.getByText('Analista Junior').first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/home-final.png` });
  // el Nivel 0 es la Base opcional: su progreso se ve en Practicar, no en el Camino
  await page.goto('/#/practicar');
  await expect(
    page
      .getByRole('region', { name: 'Base: el dinero' })
      .getByRole('listitem')
      .filter({ hasText: /El dinero en el tiempo/ }),
  ).toContainText(/(\d+) de \1 lecciones/);

  // recarga: XP, racha y lecciones completadas siguen ahí (IndexedDB); el onboarding no vuelve
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByTestId('xp-total')).toHaveText('535');
  await expect(page.getByTestId('streak')).toHaveText('1 d');
  // el Nivel 0 es la Base opcional: su progreso se ve en Practicar, no en el Camino
  await page.goto('/#/practicar');
  await expect(
    page
      .getByRole('region', { name: 'Base: el dinero' })
      .getByRole('listitem')
      .filter({ hasText: /El dinero en el tiempo/ }),
  ).toContainText(/(\d+) de \1 lecciones/);
  expect(errors).toEqual([]);
});

test('axe: onboarding, Home, teoría con explicador y feedback sin errores', async ({ page }) => {
  const scan = async (label: string) => {
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      label,
    ).toEqual([]);
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bienvenido a Albufera Partners' })).toBeVisible();
  await scan('onboarding 1');
  await page.getByRole('button', { name: 'Entrar a la oficina' }).click();
  await scan('onboarding 2');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await scan('onboarding 3');
  await page.getByLabel('Tus iniciales').fill('JAV');
  await page.getByRole('button', { name: 'Empezar mi primera lección' }).click();
  await expect(page).toHaveURL(/#\/leccion\/n1-u1-/);

  await page.goto('/#/leccion/n0-u1-l1');
  await expect(page.getByText('Inflación', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('figure', { name: 'La cesta que se encarece' })).toBeVisible();
  await scan('explicador');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar los ejercicios' }).click();
  await solve(page, lessons[0]!.exercises[0]!);
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByRole('status').first()).toContainText('Correcto');
  await scan('feedback');
  await page.goto('/#/');
  await expect(page.getByTestId('xp-total')).toBeVisible();
  await scan('home');
});
