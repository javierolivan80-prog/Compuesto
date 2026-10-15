import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, currentExercise, solve, type Ex } from './solver';

/* Flujo completo de la Unidad 1 del Nivel 0 contra la build de producción:
   las respuestas salen de los propios JSON de contenido, así el test sigue valiendo si se edita una lección. */

type Lesson = { id: string; title: string; intro: { type: string }[]; exercises: Ex[] };

const lessons: Lesson[] = [1, 2, 3, 4, 5].map((n) =>
  JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8')),
);
const SHOTS = 'docs/capturas/1.4';

async function playLesson(
  page: Page,
  lesson: Lesson,
  opts: { wrongFirst?: string; shots?: string } = {},
) {
  const shot = async (name: string) =>
    opts.shots && (await page.screenshot({ path: `${SHOTS}/${opts.shots}-${name}.png` }));
  // teoría
  for (let i = 0; i < lesson.intro.length; i++) {
    await page.waitForTimeout(500);
    await shot(`teoria-${i + 1}`);
    await page
      .getByRole('button', {
        name: i === lesson.intro.length - 1 ? 'Empezar los ejercicios' : 'Siguiente',
        exact: true,
      })
      .click();
  }
  // ejercicios: los fallos vuelven al final
  let answered = 0;
  const failed = new Set<string>();
  const closing = page.getByRole('heading', { name: 'Lección completada' });
  const check = page.getByRole('button', { name: 'Comprobar' });
  for (;;) {
    // tras Continuar, guardar y pasar al siguiente ejercicio (o al cierre) es asíncrono
    await expect(check.or(closing)).toBeVisible();
    if (await closing.count()) break;
    const e = await currentExercise(page, lesson.exercises);
    const wrong = e.id === opts.wrongFirst && !failed.has(e.id);
    await solve(page, e, wrong);
    await check.click();
    const status = page.getByRole('status').first();
    await expect(status).toContainText(wrong ? 'Casi: repásalo' : 'Correcto');
    if (answered === 0) await shot(wrong ? 'feedback-fallo' : 'feedback-acierto');
    if (answered === 1) await shot('ejercicio-siguiente');
    if (wrong) failed.add(e.id);
    answered++;
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(status).toBeHidden();
  }
  await page.waitForTimeout(800);
  await shot('cierre');
  return { answered, failed: failed.size };
}

test('se completa la Unidad 1 entera, los fallos vuelven y el progreso sobrevive a la recarga', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // el onboarding termina directamente en la primera lección
  await completeOnboarding(page);

  // L1: el primer ejercicio se falla a propósito → vuelve al final
  const r1 = await playLesson(page, lessons[0]!, {
    wrongFirst: lessons[0]!.exercises[0]!.id,
    shots: 'l1',
  });
  expect(r1.answered).toBe(lessons[0]!.exercises.length + 1); // 8 + el fallo repetido
  await expect(page.getByText('88 %')).toBeVisible(); // 7/8 a la primera
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByTestId('xp-total')).toHaveText('95'); // 7×10 + 5 (repaso) + 20 (≥ 80 %)
  await expect(page.getByTestId('streak')).toHaveText('1 d');

  for (const [i, l] of lessons.slice(1).entries()) {
    await page
      .getByRole('listitem')
      .filter({ hasText: l.title })
      .getByRole('button', { name: 'Empezar' })
      .click();
    await playLesson(page, l, i === 0 ? { shots: 'l2' } : {});
    await page.getByRole('button', { name: 'Continuar' }).click();
  }

  // 95 + 100 + 100 + 100 + 120
  await expect(page.getByTestId('xp-total')).toHaveText('515');
  await expect(page.getByText('Analista Junior').first()).toBeVisible();
  await expect(page.getByText(/✓ completada/)).toHaveCount(5);
  await page.screenshot({ path: `${SHOTS}/home-final.png` });

  // recarga: XP, racha y lecciones completadas siguen ahí (IndexedDB); el onboarding no vuelve
  await page.reload();
  await expect(page.getByTestId('xp-total')).toHaveText('515');
  await expect(page.getByTestId('streak')).toHaveText('1 d');
  await expect(page.getByText(/✓ completada/)).toHaveCount(5);
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
