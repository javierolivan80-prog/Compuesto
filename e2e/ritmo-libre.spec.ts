import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { playCurrentLesson } from './play-any';
import { completeOnboarding, currentExercise, solve, type Ex } from './solver';

/*
 * Ritmo libre (DECISIONES.md, 29/10/2026): después de una lección o de un repaso siempre hay un botón principal
 * para seguir. Contra la build de producción.
 */

const allExercises: Ex[] = readdirSync('content/es/levels', { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.json'))
  .flatMap(
    (f) =>
      (JSON.parse(readFileSync(`content/es/levels/${f}`, 'utf8')) as { exercises: Ex[] }).exercises,
  );
const baseExercises: Ex[] = [1, 2, 3].flatMap(
  (n) =>
    (
      JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8')) as {
        exercises: Ex[];
      }
    ).exercises,
);

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

/** Copia con ejercicios de la Base fallados hace 3 días (hoy vencen) y otros acertados (práctica extra). */
function backup(failed: string[], right: string[]): string {
  const when = Date.now() - 3 * DAY;
  let i = 0;
  const answer = (id: string, correct: boolean) =>
    ev('exercise_answered', new Date(when + i++ * 60_000).toISOString(), {
      exerciseId: id,
      lessonId: 'n0-u1-l1',
      conceptIds: ['inflacion'],
      correct,
      timeMs: 4000,
      xp: correct ? 10 : 0,
    });
  const at = new Date(when).toISOString();
  return JSON.stringify({
    format: 'compuesto-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    events: [
      ev('settings_changed', at, { key: 'onboarded', value: true }),
      ev('settings_changed', at, { key: 'tickerInitials', value: 'JAV' }),
      ...failed.map((id) => answer(id, false)),
      ...right.map((id) => answer(id, true)),
    ],
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

/** Responde bien toda la tanda hasta «Repaso completado». */
async function answerBatch(page: Page) {
  const end = page.getByRole('heading', { name: 'Repaso completado' });
  for (let guard = 0; guard < 40; guard++) {
    const check = page.getByRole('button', { name: 'Comprobar' });
    await expect(check.or(end)).toBeVisible();
    if (await end.isVisible()) return;
    await solve(page, await currentExercise(page, allExercises));
    const counter = page.getByRole('heading', { level: 1 });
    const before = await counter.textContent();
    await check.click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(async () => {
      const now = (await counter.textContent()) ?? '';
      expect(now !== before || (await end.isVisible())).toBe(true);
    }).toPass();
  }
  throw new Error('La tanda no terminó');
}

test('al terminar una lección, «Siguiente lección» abre la siguiente del Camino', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const first = page.url();
  const { lesson } = await playCurrentLesson(page);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();

  const next = page.getByRole('button', { name: 'Siguiente lección' });
  await expect(next).toBeVisible();
  await expect(page.getByRole('button', { name: 'Practicar', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
  // botón principal de al menos 48 px
  expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(48);

  await next.click();
  await expect(page).toHaveURL(/#\/leccion\/n1-u\d+-l\d+$/);
  expect(page.url()).not.toBe(first);
  const header = page.getByText(/^N\d+-U\d+ · /).first();
  await expect(header).toBeVisible();
  await expect(header).not.toHaveText(new RegExp(`· ${lesson.title}$`));
});

test('al terminar un repaso, «Seguir practicando» carga otra tanda (práctica extra si no queda nada)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const ids = baseExercises.map((e) => e.id);
  await importBackup(page, backup(ids.slice(0, 2), ids.slice(2, 8)));
  await page.goto('/#/practicar');
  await page.reload();
  await page.getByRole('button', { name: 'Empezar repaso' }).click();
  await expect(page.getByRole('heading', { name: /Due diligence · 1 de \d+/ })).toBeVisible();
  await answerBatch(page);

  await page.getByRole('button', { name: 'Seguir practicando' }).click();
  await expect(
    page.getByRole('heading', { name: /(Due diligence|Práctica extra) · 1 de \d+/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeVisible();

  // Practicar sin nada que venza ofrece igualmente «Practicar más»
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByTestId('due-count')).toContainText('Nada vence hoy');
  await page.getByRole('button', { name: 'Practicar más' }).click();
  await expect(page.getByRole('heading', { name: /Práctica extra · 1 de \d+/ })).toBeVisible();
});

test('el cierre de la sesión ofrece «Seguir estudiando» y abre la siguiente lección', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/sesion');
  await page.getByRole('button', { name: '5 min', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir sesión de 5 min' }).click();
  await playCurrentLesson(page);
  await page.getByRole('button', { name: 'Siguiente bloque' }).click();
  await expect(page.getByRole('heading', { name: 'Cierre de mercado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Más tarde' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir estudiando' }).click();
  await expect(page).toHaveURL(/#\/leccion\/n1-u\d+-l\d+$/);
  await expect(page.getByText(/^N\d+-U\d+ · /).first()).toBeVisible();
});
