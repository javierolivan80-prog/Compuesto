import { expect, type Page } from '@playwright/test';
import { currentExercise, solve, type Ex } from './solver';

export type Lesson = { id: string; title: string; intro: { type: string }[]; exercises: Ex[] };

/** Juega una lección entera por la interfaz con las respuestas del propio JSON; los fallos a propósito vuelven al final. */
export async function playLesson(
  page: Page,
  lesson: Lesson,
  opts: { wrongFirst?: string; shots?: string; shotsDir?: string } = {},
) {
  const shot = async (name: string) =>
    opts.shots &&
    (await page.screenshot({
      path: `${opts.shotsDir ?? 'docs/capturas'}/${opts.shots}-${name}.png`,
    }));
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
