import { expect, type Page } from '@playwright/test';
import { exerciseSchema } from '../src/content/schemas';
import { instantiate, variantSeedFor } from '../src/engine/params';
import { todayKey } from '../src/engine/stats';

/* Resuelve ejercicios por la interfaz a partir de su JSON (respuesta correcta o a propósito incorrecta). */

export type Ex = {
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
  target?: string;
  solution?: string;
  claim?: string;
  intro?: string;
  lines?: string[];
  errorIndex?: number;
  questions?: { prompt: string; options: string[]; answer: number }[];
  modelAnswer?: string;
  rubric?: string[];
};

export const promptOf = (e: Ex) =>
  e.type === 'true_false_swipe'
    ? 'Verdadero o falso'
    : e.type === 'best_argument'
      ? (e.claim ?? '')
      : e.type === 'case_step'
        ? (e.intro ?? '')
        : e.type === 'document_read'
          ? 'Lee el fragmento y contesta'
          : (e.prompt ?? '');

export async function currentExercise(page: Page, exercises: Ex[]): Promise<Ex> {
  const heading = (await page.getByRole('heading', { level: 3 }).first().textContent())?.trim();
  // Paramétricos (tarea 2.9): en la lección salen con las cifras del enunciado; en el repaso, con las de hoy.
  const today = todayKey(new Date());
  const candidates = exercises
    .flatMap((raw) => {
      const e = exerciseSchema.parse(raw);
      const base = instantiate(e).exercise as unknown as Ex;
      const variant = instantiate(e, variantSeedFor(e.id, today)).exercise as unknown as Ex;
      return variant === base ? [base] : [base, variant];
    })
    .filter((e) => promptOf(e) === heading)
    // misma plantilla con el mismo enunciado (p. ej. una hoja sin cifras en el texto): vale cualquiera
    .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i);
  if (candidates.length === 1) return candidates[0]!;
  for (const e of candidates)
    if (e.statement && (await page.getByText(e.statement, { exact: true }).count())) return e;
  throw new Error(`No reconozco el ejercicio con título "${heading}"`);
}

export async function solve(page: Page, e: Ex, wrong = false) {
  const exact = { exact: true } as const;
  switch (e.type) {
    case 'multiple_choice':
    case 'scenario':
    case 'chart_read':
    case 'best_argument': {
      const idx = wrong ? (e.answer === 0 ? 1 : 0) : (e.answer as number);
      await page.getByRole('radio', { name: e.options![idx]!, ...exact }).click();
      break;
    }
    case 'multi_select': {
      if (wrong) {
        const bad = e.options!.findIndex((_, i) => !(e.answers as number[]).includes(i));
        await page.getByRole('checkbox', { name: e.options![bad]!, ...exact }).click();
      } else
        for (const i of e.answers as number[])
          await page.getByRole('checkbox', { name: e.options![i]!, ...exact }).click();
      break;
    }
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
          .getByRole('button', {
            name: new RegExp(`${it.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
          })
          .click();
      break;
    case 'spot_the_error': {
      const idx = wrong ? (e.errorIndex === 0 ? 1 : 0) : (e.errorIndex as number);
      await page.getByRole('radio', { name: e.lines![idx]!, exact: false }).click();
      break;
    }
    case 'slider_estimate': {
      const a = (e as unknown as { answer: number; min: number }).answer;
      const v = wrong ? (e as unknown as { max: number }).max : a;
      await page.locator('input[type="range"]').fill(String(v));
      break;
    }
    case 'document_read':
      for (const [qi, q] of e.questions!.entries()) {
        const idx = wrong ? (q.answer === 0 ? 1 : 0) : q.answer;
        await page
          .getByRole('radiogroup', { name: q.prompt })
          .getByRole('radio', { name: q.options[idx]!, ...exact })
          .click();
        void qi;
      }
      break;
    case 'self_explain':
      await page.getByRole('textbox').fill('Mi explicación con mis palabras.');
      await page.getByRole('button', { name: 'Ver respuesta modelo' }).click();
      for (const r of e.rubric!.slice(0, wrong ? 0 : 3))
        await page.getByRole('checkbox', { name: r, ...exact }).click();
      break;
    case 'spreadsheet':
      await page.locator(`input[aria-label="Celda ${e.target}"]`).fill(e.solution!);
      break;
    default:
      throw new Error(`Tipo sin solver: ${e.type}`);
  }
}

/** Onboarding de 3 pantallas hasta la primera lección. */
export async function completeOnboarding(page: Page, initials = 'JAV', url = '/') {
  await page.goto(url);
  await page.getByRole('button', { name: 'Entrar a la oficina' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Tus iniciales').fill(initials);
  await page.getByRole('button', { name: 'Empezar mi primera lección' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeVisible();
}
