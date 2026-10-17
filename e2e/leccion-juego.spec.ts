import { expect, test } from '@playwright/test';
import { completeOnboarding } from './solver';

/* Lección-juego (docs/cambios/rumbo-juego-mercado): se juega primero y la teoría y los ejercicios usan tus cifras. */

test('la compra grande: juego → explicación con tus cifras → ejercicios con tus cifras', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u4-l7');
  await expect(page.getByRole('heading', { name: 'La compra grande' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'docs/capturas/leccion-juego/juego-375.png', fullPage: true });

  await page.getByRole('button', { name: '300' }).click();
  await page.getByRole('button', { name: 'Comprar 300 a mercado' }).click();
  await page.getByRole('button', { name: 'Lo que queda (300)' }).click();
  await page.getByRole('button', { name: 'Comprar 300 a mercado' }).click();
  const avg = (await page.getByTestId('bt-avg').textContent())!.trim();
  await page.screenshot({ path: 'docs/capturas/leccion-juego/resultado-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Ver qué ha pasado' }).click();

  // la primera tarjeta cita tu precio medio real
  await expect(page.getByText(`Pagaste de media ${avg}`)).toBeVisible();
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/explicacion-375.png',
    fullPage: true,
  });
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: /Siguiente|Empezar los ejercicios/ }).click();

  // el primer ejercicio usa lo que pagaste en tu partida: el precio medio es la respuesta
  const n = avg.replace(/\s?€/, '').trim();
  await expect(page.getByRole('heading', { level: 3 })).toContainText(
    /Pagaste [\d.,]+ € por 600 acciones/,
  );
  await page.getByRole('textbox', { name: /Tu respuesta/ }).fill(n.replace(/\./g, ''));
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByRole('status')).toContainText('Correcto');
});
