import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/* Flujo completo de la Unidad 1 del Nivel 0 contra la build de producción:
   las respuestas salen de los propios JSON de contenido, así el test sigue valiendo si se edita una lección. */

type Ex = {
  id: string;
  type: string;
  prompt?: string;
  statement?: string;
  options?: string[];
  answer?: number | boolean;
  answers?: unknown;
  steps?: string[];
  categories?: string[];
  items?: { text: string; category: string }[];
};
type Lesson = { id: string; title: string; intro: { type: string }[]; exercises: Ex[] };

const lessons: Lesson[] = [1, 2, 3, 4, 5].map((n) =>
  JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8')),
);
const SHOTS = 'docs/capturas/1.4';

const promptOf = (e: Ex) =>
  e.type === 'true_false_swipe' ? 'Verdadero o falso' : (e.prompt ?? '');

async function currentExercise(page: Page, lesson: Lesson): Promise<Ex> {
  const heading = (await page.getByRole('heading', { level: 3 }).first().textContent())?.trim();
  const candidates = lesson.exercises.filter((e) => promptOf(e) === heading);
  if (candidates.length === 1) return candidates[0]!;
  for (const e of candidates)
    if (e.statement && (await page.getByText(e.statement, { exact: true }).count())) return e;
  throw new Error(`No reconozco el ejercicio con título "${heading}"`);
}

async function solve(page: Page, e: Ex, wrong = false) {
  const exact = { exact: true } as const;
  switch (e.type) {
    case 'multiple_choice': {
      const idx = wrong ? (e.answer === 0 ? 1 : 0) : (e.answer as number);
      await page.getByRole('radio', { name: e.options![idx]!, ...exact }).click();
      break;
    }
    case 'multi_select':
      for (const i of e.answers as number[])
        await page.getByRole('checkbox', { name: e.options![i]!, ...exact }).click();
      break;
    case 'true_false_swipe':
      await page
        .getByRole('radio', {
          name: (e.answer as boolean) !== wrong ? 'Verdadero' : 'Falso',
          ...exact,
        })
        .click();
      break;
    case 'fill_blank':
      await page
        .getByRole('textbox')
        .first()
        .fill((e.answers as string[][])[0]![0]!);
      break;
    case 'numeric_input': {
      const a = (e as unknown as { answer: number }).answer;
      await page.getByRole('textbox', { name: /Tu respuesta/ }).fill(String(a).replace('.', ','));
      break;
    }
    case 'order_steps':
      for (let target = 0; target < e.steps!.length; target++) {
        for (let guard = 0; guard < 10; guard++) {
          const order = await page
            .locator('ol[aria-labelledby] > li')
            .evaluateAll(
              (lis, ss) => lis.map((li) => ss.findIndex((s) => li.textContent?.includes(s))),
              e.steps!,
            );
          if (order[target] === target) break;
          await page.getByRole('button', { name: `Subir «${e.steps![target]}»`, ...exact }).click();
        }
      }
      break;
    case 'categorize':
      for (const it of e.items!)
        await page
          .getByRole('group', { name: it.text, ...exact })
          .getByRole('button', { name: new RegExp(`${it.category}$`) })
          .click();
      break;
    default:
      throw new Error(`Tipo sin solver: ${e.type}`);
  }
}

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
    const e = await currentExercise(page, lesson);
    const wrong = e.id === opts.wrongFirst && !failed.has(e.id);
    await solve(page, e, wrong);
    await page.getByRole('button', { name: 'Comprobar' }).click();
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

  await page.goto('/');
  await expect(page.getByTestId('xp-total')).toHaveText('0');
  await page.screenshot({ path: `${SHOTS}/home-inicial.png` });

  // L1: el primer ejercicio se falla a propósito → vuelve al final
  await page
    .getByRole('button', { name: 'Abrir mercado: Inflación: por qué tu dinero compra menos' })
    .click();
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

  // recarga: XP, racha y lecciones completadas siguen ahí (IndexedDB)
  await page.reload();
  await expect(page.getByTestId('xp-total')).toHaveText('515');
  await expect(page.getByTestId('streak')).toHaveText('1 d');
  await expect(page.getByText(/✓ completada/)).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('axe: Home, teoría con explicador, ejercicio con feedback y cierre sin errores (también con movimiento)', async ({
  page,
}) => {
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
  await expect(page.getByTestId('xp-total')).toBeVisible();
  await scan('home');
  await page.goto('/#/leccion/n0-u1-l1');
  await expect(page.getByText('Inflación', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('figure', { name: 'La cesta que se encarece' })).toBeVisible();
  await scan('explicador');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar los ejercicios' }).click();
  const e = lessons[0]!.exercises[0]!;
  await solve(page, e);
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByRole('status').first()).toContainText('Correcto');
  await scan('feedback');
});
