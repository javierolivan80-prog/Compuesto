import AxeBuilder from '@axe-core/playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, currentExercise, solve, type Ex } from './solver';

/* Onboarding en menos de 60 s y tests de salto (unidad suelta y nivel completo) contra la build de producción. */

type Bank = { id: string; unitId: string; questions: Ex[] };
const banks: Record<string, Bank> = Object.fromEntries(
  readdirSync('content/es/placement').map((f) => {
    const b: Bank = JSON.parse(readFileSync(`content/es/placement/${f}`, 'utf8'));
    return [b.unitId, b];
  }),
);

/** Hace el test de una unidad: `wrongCount` preguntas a propósito mal, el resto bien. */
async function takeTest(page: Page, unitId: string, wrongCount = 0) {
  const bank = banks[unitId]!;
  await page.getByRole('button', { name: 'Empezar el test' }).click();
  for (let i = 0; i < bank.questions.length; i++) {
    await expect(page.getByText(`Pregunta ${i + 1} de 8`).first()).toBeVisible();
    const q = await currentExercise(page, bank.questions);
    await solve(page, q, i < wrongCount);
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  }
}

const ready = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/');
  await expect(page.getByTestId('xp-total')).toBeVisible();
};

test('el onboarding lleva a la primera lección en menos de 60 s y no vuelve a salir', async ({
  page,
}) => {
  const t0 = Date.now();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bienvenido a Albufera Partners' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar a la oficina' }).click();
  await page.getByRole('button', { name: /^15 min$/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Tus iniciales').fill('jav');
  await page.getByRole('button', { name: 'Empezar mi primera lección' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeVisible();
  const seconds = (Date.now() - t0) / 1000;
  console.log(`onboarding → primera lección: ${seconds.toFixed(1)} s`);
  expect(seconds).toBeLessThan(60);

  await page.goto('/#/');
  await expect(page.getByTestId('xp-total')).toBeVisible(); // Home, no onboarding
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bienvenido a Albufera Partners' })).toHaveCount(
    0,
  );
});

test('test de salto aprobado: unidad marcada como dominada, persiste y no se repite', async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'El dinero en el tiempo' })
    .getByRole('button', { name: 'Test de salto' })
    .click();
  await expect(page.getByRole('heading', { name: 'Test de salto' })).toBeVisible();
  await takeTest(page, 'n0-u1', 0);
  await expect(page.getByRole('heading', { name: 'Unidad dominada' })).toBeVisible();
  await expect(page.getByTestId('placement-score')).toHaveText('8 de 8 · 100 %');
  await page.getByRole('button', { name: 'Volver al inicio' }).click();

  const row = page
    .getByRole('listitem')
    .filter({ hasText: 'El dinero en el tiempo' })
    .filter({ hasText: 'Dominada por test de salto' });
  await expect(row.getByRole('button', { name: 'Test de salto' })).toBeDisabled();
  await page.reload();
  await expect(row.getByRole('button', { name: 'Test de salto' })).toBeDisabled();
  await expect(page.getByTestId('xp-total')).toHaveText('0'); // el test no da XP ni racha
});

test('test de salto suspendido (6 de 8 = 75 %): no se marca y se ofrece estudiar la unidad', async ({
  page,
}) => {
  await ready(page);
  await page.goto('/#/salto/n0-u1');
  await takeTest(page, 'n0-u1', 2);
  await expect(page.getByRole('heading', { name: 'Todavía no' })).toBeVisible();
  await expect(page.getByTestId('placement-score')).toHaveText('6 de 8 · 75 %');
  await page.getByRole('button', { name: 'Estudiar la unidad' }).click();
  await expect(
    page.getByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeVisible();
  await page.goto('/#/camino');
  await expect(page.getByText('Dominada por test de salto')).toHaveCount(0);
});

test('7 de 8 (87,5 %) es el mínimo que aprueba', async ({ page }) => {
  await ready(page);
  await page.goto('/#/salto/n0-u2');
  await takeTest(page, 'n0-u2', 1);
  await expect(page.getByTestId('placement-score')).toHaveText('7 de 8 · 88 %');
  await expect(page.getByRole('heading', { name: 'Unidad dominada' })).toBeVisible();
});

test('saltar el Nivel 0 completo encadena las 5 unidades', async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
  await page.goto('/#/camino');
  await page.getByRole('button', { name: 'Saltar el Nivel 0' }).click();
  const units = ['n0-u1', 'n0-u2', 'n0-u3', 'n0-u4', 'n0-u5'];
  for (const [i, u] of units.entries()) {
    await takeTest(page, u, 0);
    await expect(page.getByRole('heading', { name: 'Unidad dominada' })).toBeVisible();
    await page
      .getByRole('button', { name: i === units.length - 1 ? 'Ver el resumen' : 'Siguiente unidad' })
      .click();
  }
  await expect(page.getByRole('heading', { name: /nivel saltado/ })).toBeVisible();
  await expect(page.getByText('✓ Dominada')).toHaveCount(5);
  await page.getByRole('button', { name: 'Volver al Camino' }).click();
  await expect(page.getByText('✓ Dominada por test de salto')).toHaveCount(5);
});

test('saltar un nivel: la cadena se detiene en la primera unidad suspendida', async ({ page }) => {
  await ready(page);
  await page.goto('/#/saltar-nivel/1');
  await takeTest(page, 'n1-u1', 0);
  await page.getByRole('button', { name: 'Siguiente unidad' }).click();
  await takeTest(page, 'n1-u2', 3);
  await expect(page.getByRole('heading', { name: 'Todavía no' })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente unidad' }).click();
  await expect(page.getByRole('heading', { name: /saltado en parte/ })).toBeVisible();
  await expect(page.getByText(/✓ Dominada · La empresa y la acción/)).toBeVisible();
  await expect(page.getByText(/✗ No superada · Mercado primario y secundario/)).toBeVisible();
  await expect(page.getByText(/· Sin hacer · Bolsas e índices/)).toBeVisible();
});

test('axe en el test de salto (intro, pregunta y resultado)', async ({ page }) => {
  await ready(page);
  const scan = async (label: string) => {
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      label,
    ).toEqual([]);
  };
  await page.goto('/#/salto/n1-u4');
  await scan('intro');
  await page.getByRole('button', { name: 'Empezar el test' }).click();
  await scan('pregunta');
  await page.reload(); // vuelve a la introducción del mismo test
  await takeTest(page, 'n1-u4', 0);
  await scan('resultado');
});
