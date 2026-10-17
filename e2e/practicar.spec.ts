import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { exerciseSchema } from '../src/content/schemas';
import { instantiate, variantSeedFor } from '../src/engine/params';
import { todayKey } from '../src/engine/stats';
import { completeOnboarding, currentExercise, promptOf, solve, type Ex } from './solver';

/* Tarea 2.1: Practicar (repaso espaciado, mis errores, por tema y examen) contra la build de producción. */

const lesson = (n: number): Lesson =>
  JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8'));
const unitExercises: Ex[] = [1, 2, 3, 4, 5].flatMap((n) => lesson(n).exercises);

const DAY = 86_400_000;
const ev = (type: string, createdAt: string, payload: object) => ({
  id: randomUUID(),
  type,
  createdAt,
  deviceId: 'test',
  schemaVersion: 1,
  tz: 'Europe/Madrid',
  payload,
});

/** Copia con ejercicios fallados hace `daysAgo` días: hoy están vencidos. */
function backupWithPastMistakes(ids: string[], daysAgo: number): string {
  const when = new Date(Date.now() - daysAgo * DAY).toISOString();
  const events = [
    ev('settings_changed', when, { key: 'onboarded', value: true }),
    ev('settings_changed', when, { key: 'tickerInitials', value: 'JAV' }),
    ...ids.map((id, i) =>
      ev('exercise_answered', new Date(Date.parse(when) + i * 60_000).toISOString(), {
        exerciseId: id,
        lessonId: 'n0-u1-l1',
        conceptIds: ['inflacion'],
        correct: false,
        timeMs: 4000,
        xp: 0,
      }),
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
  await page.goto('/#/despacho/ajustes');
  await page.setInputFiles('input[type="file"]', {
    name: 'copia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await page.getByRole('button', { name: 'Reemplazar mi progreso' }).click();
  await expect(page.getByText('Copia importada.')).toBeVisible({ timeout: 30_000 });
}

/** Resuelve bien todos los ejercicios de una sesión de repaso/examen. */
async function answerAll(page: Page, exam: boolean) {
  const end = page.getByRole('heading', { name: /Repaso completado|Examen terminado/ });
  for (let guard = 0; guard < 40; guard++) {
    if (await end.isVisible()) return;
    const check = page.getByRole('button', { name: exam ? 'Responder' : 'Comprobar' });
    await expect(check.or(end)).toBeVisible();
    if (await end.isVisible()) return;
    await solve(page, await currentExercise(page, unitExercises));
    const counter = page.getByRole('heading', { level: 1 });
    const before = await counter.textContent();
    await check.click();
    if (!exam) await page.getByRole('button', { name: 'Continuar' }).click();
    // espera a que pase a la siguiente pregunta (o al resultado) antes de leerla
    await expect(async () => {
      const now = (await counter.textContent()) ?? '';
      expect(now !== before || (await end.isVisible())).toBe(true);
    }).toPass();
  }
}

test('un fallo en la lección aparece en «Mis errores» y repasarlo lo limpia', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const l1 = lesson(1);
  await playLesson(page, l1, { wrongFirst: l1.exercises[0]!.id });
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.goto('/#/practicar');
  await page.reload();
  // fallado hoy → vuelve mañana, no hoy
  await expect(page.getByTestId('due-count')).toContainText('Nada vence hoy');
  await expect(page.getByText(/1 ejercicio donde tu último intento fue un fallo/)).toBeVisible();

  await page.getByRole('button', { name: 'Repasar mis errores' }).click();
  await expect(page.getByRole('heading', { name: /Mis errores · 1 de 1/ })).toBeVisible();
  await answerAll(page, false);
  await expect(page.getByTestId('review-score')).toHaveText('1 de 1 aciertos');
  await expect(page.getByTestId('review-xp')).toHaveText('+5 XP');
  await page.getByRole('button', { name: 'Volver a Practicar' }).click();
  await expect(page.getByText('Sin errores pendientes')).toBeVisible();
});

test('ejercicios fallados hace días están vencidos: Due diligence los repasa y dejan de tocar', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const ids = unitExercises.slice(0, 3).map((e) => e.id);
  await importBackup(page, backupWithPastMistakes(ids, 3));
  await page.goto('/#/practicar');
  await page.reload();
  await expect(page.getByTestId('due-count')).toContainText('3 tarjetas tocan hoy');

  await page.getByRole('button', { name: 'Empezar repaso' }).click();
  await expect(page.getByRole('heading', { name: /Due diligence · 1 de 3/ })).toBeVisible();
  await answerAll(page, false);
  await expect(page.getByTestId('review-score')).toHaveText('3 de 3 aciertos');
  await page.getByRole('button', { name: 'Volver a Practicar' }).click();
  await expect(page.getByTestId('due-count')).toContainText('Nada vence hoy');
});

test('práctica por tema desde el dominio de un concepto', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await importBackup(
    page,
    backupWithPastMistakes(
      unitExercises.slice(0, 3).map((e) => e.id),
      3,
    ),
  );
  await page.goto('/#/practicar');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Por tema' })).toBeVisible();
  await page.getByRole('button', { name: /^Practicar Inflación/ }).click();
  await expect(page.getByRole('heading', { name: /Tema: Inflación/ })).toBeVisible();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByRole('heading', { name: 'Practicar', exact: true })).toBeVisible();
});

test('examen cronometrado: 10 preguntas, temporizador y resultado al final', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  for (const n of [1, 2, 3, 4, 5]) {
    await playLesson(page, lesson(n));
    await page.getByRole('button', { name: 'Continuar' }).click();
    if (n < 5) await page.goto(`/#/leccion/n0-u1-l${n + 1}`);
  }
  await page.goto('/#/practicar');
  await page.reload();
  await page.getByRole('button', { name: /^Examen de El dinero en el tiempo/ }).click();
  await expect(page.getByTestId('exam-timer')).toContainText('10:00');
  await expect(page.getByRole('heading', { name: /Examen: .* · 1 de 10/ })).toBeVisible();
  await answerAll(page, true);
  await expect(page.getByRole('heading', { name: 'Examen terminado' })).toBeVisible();
  await expect(page.getByTestId('review-score')).toHaveText('10 de 10 aciertos');
});

test('un ejercicio paramétrico se repasa con cifras nuevas y se corrige con su fórmula (tarea 2.9)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const id = 'n0-u1-l2-e4';
  const template = exerciseSchema.parse(lesson(2).exercises.find((e) => e.id === id));
  const inLesson = instantiate(template).exercise;
  const today = instantiate(template, variantSeedFor(id, todayKey(new Date())));
  const variant = today.exercise as Extract<typeof today.exercise, { type: 'numeric_input' }>;
  expect(promptOf(variant as unknown as Ex)).not.toBe(promptOf(inLesson as unknown as Ex));

  await importBackup(page, backupWithPastMistakes([id], 3));
  await page.goto('/#/practicar');
  await page.reload();
  await page.getByRole('button', { name: 'Empezar repaso' }).click();
  // cifras de hoy, no las de la lección
  await expect(page.getByRole('heading', { level: 3, name: variant.prompt })).toBeVisible();
  await expect(page.getByText(promptOf(inLesson as unknown as Ex))).toHaveCount(0);
  // la respuesta del enunciado original ya no vale…
  const lessonAnswer = (inLesson as { answer: number }).answer;
  if (Math.abs(lessonAnswer - variant.answer) > variant.answer * 0.0001) {
    await page
      .getByRole('textbox', { name: /Tu respuesta/ })
      .fill(String(lessonAnswer).replace('.', ','));
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await expect(page.getByRole('status')).not.toHaveText(/Correcto/);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByTestId('review-score')).toHaveText('0 de 1 aciertos');
  }
});

test('…y la respuesta calculada con las cifras de hoy es correcta', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const id = 'n0-u1-l2-e4';
  await importBackup(page, backupWithPastMistakes([id], 3));
  await page.goto('/#/practicar');
  await page.reload();
  await page.getByRole('button', { name: 'Empezar repaso' }).click();
  await answerAll(page, false);
  await expect(page.getByTestId('review-score')).toHaveText('1 de 1 aciertos');
});
