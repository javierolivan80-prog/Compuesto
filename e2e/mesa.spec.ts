import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { completeOnboarding } from './solver';

/* La Mesa (docs/specs/la-mesa.md) contra la build de producción. */

test('comprar, cerrar el día y ver por qué se movió el mercado', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/');
  await expect(page.getByTestId('mesa-home')).toContainText('La Mesa · Día 1');
  await page.getByRole('link', { name: 'Ir a La Mesa' }).click();

  await expect(page.getByRole('heading', { name: 'La Mesa', level: 1 })).toBeVisible();
  await expect(page.getByTestId('mesa-day')).toContainText('Día 1');
  await expect(page.getByTestId('mesa-headline')).not.toBeEmpty();

  // comprar 10 acciones de Naranjas del Turia
  await page.getByRole('button', { name: /^Operar Naranjas del Turia/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByTestId('mesa-total')).toContainText('€');
  // pedir más de lo que cabe: la orden no se puede enviar
  await sheet.getByRole('textbox').fill('999999');
  await expect(sheet.getByRole('status')).toHaveText('No tienes caja suficiente.');
  await expect(sheet.getByRole('button', { name: /^Comprar 999.999 acciones/ })).toBeDisabled();
  await sheet.getByRole('textbox').fill('10');
  await sheet.getByRole('button', { name: 'Comprar 10 acciones' }).click();
  await expect(page.getByTestId('mesa-notice')).toContainText('Orden ejecutada: comprar 10 NAR');
  await expect(page.getByTestId('mesa-positions')).toContainText('NAR · 10');

  // vender sin posición está bloqueado
  await page.getByRole('button', { name: /^Operar Pirineo Energía/ }).click();
  await sheet.getByRole('button', { name: 'Vender', exact: true }).click();
  await sheet.getByRole('textbox').fill('1');
  await expect(sheet.getByRole('status')).toContainText('No tienes tantas acciones');
  await page.keyboard.press('Escape');

  // cerrar el día
  await page.getByRole('button', { name: 'Cerrar el día' }).click();
  await expect(page.getByTestId('mesa-close')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cierre del día 1' })).toBeVisible();
  await expect(page.getByTestId('mesa-xp')).toHaveText('+5 XP'); // un solo valor: sin bonus de diversificar
  await page.getByRole('button', { name: 'Siguiente día' }).click();
  await expect(page.getByTestId('mesa-day')).toContainText('Día 2');
  await expect(page.getByTestId('mesa-positions')).toContainText('NAR · 10');

  // tras recargar, todo sigue (proyección desde eventos)
  await page.reload();
  await expect(page.getByTestId('mesa-day')).toContainText('Día 2');
  await expect(page.getByTestId('mesa-positions')).toContainText('NAR · 10');
  await page.goto('/#/');
  await expect(page.getByTestId('mesa-home')).toContainText('La Mesa · Día 2');
});

test('tope de 5 días de mercado por día real', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/mesa');
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: 'Cerrar el día' }).click();
    await expect(page.getByRole('heading', { name: `Cierre del día ${i}` })).toBeVisible();
    if (i < 5) await page.getByRole('button', { name: 'Siguiente día' }).click();
  }
  await expect(page.getByRole('button', { name: 'Siguiente día' })).toHaveCount(0);
  await expect(page.getByText(/La Mesa abre mañana/)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('mesa-come-back')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar el día' })).toHaveCount(0);
});

for (const [w, h] of [
  [375, 812],
  [1440, 900],
] as const)
  test(`La Mesa a ${w} px: sin scroll horizontal, axe limpio y captura`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completeOnboarding(page);
    await page.goto('/#/mesa');
    await expect(page.getByRole('heading', { name: 'La Mesa', level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({ path: `docs/capturas/mesa/mesa-${w}.png`, fullPage: true });
    await page.getByRole('button', { name: /^Operar Naranjas del Turia/ }).click();
    await page.screenshot({ path: `docs/capturas/mesa/mesa-operar-${w}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cerrar el día' }).click();
    await expect(page.getByTestId('mesa-close')).toBeVisible();
    await page.screenshot({ path: `docs/capturas/mesa/mesa-cierre-${w}.png`, fullPage: true });
  });
