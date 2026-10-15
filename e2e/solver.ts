import { expect, type Page } from '@playwright/test';

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
};

export const promptOf = (e: Ex) =>
  e.type === 'true_false_swipe' ? 'Verdadero o falso' : (e.prompt ?? '');

export async function currentExercise(page: Page, exercises: Ex[]): Promise<Ex> {
  const heading = (await page.getByRole('heading', { level: 3 }).first().textContent())?.trim();
  const candidates = exercises.filter((e) => promptOf(e) === heading);
  if (candidates.length === 1) return candidates[0]!;
  for (const e of candidates)
    if (e.statement && (await page.getByText(e.statement, { exact: true }).count())) return e;
  throw new Error(`No reconozco el ejercicio con título "${heading}"`);
}

export async function solve(page: Page, e: Ex, wrong = false) {
  const exact = { exact: true } as const;
  switch (e.type) {
    case 'multiple_choice': {
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
          .getByRole('button', { name: new RegExp(`${it.category}$`) })
          .click();
      break;
    default:
      throw new Error(`Tipo sin solver: ${e.type}`);
  }
}

/** Onboarding de 3 pantallas hasta la primera lección. */
export async function completeOnboarding(page: Page, initials = 'JAV') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar a la oficina' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Tus iniciales').fill(initials);
  await page.getByRole('button', { name: 'Empezar mi primera lección' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeVisible();
}
