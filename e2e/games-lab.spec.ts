import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/* Tarea 2.4: cada pieza del kit de game feel en /games-lab (solo desarrollo). */

const axe = async (page: Page, label: string) => {
  // La cinta de fondo es decorativa (aria-hidden, al 30 % de opacidad por diseño): WCAG 1.4.3 exime el texto
  // meramente decorativo, pero axe no puede saberlo.
  const r = await new AxeBuilder({ page })
    .exclude('.kit-ticker')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    label,
  ).toEqual([]);
};

test('el laboratorio pasa axe a 375 y 1440 px, sin scroll horizontal', async ({ page }) => {
  for (const [w, h] of [
    [375, 812],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/games-lab');
    await expect(page.getByRole('heading', { name: 'Kit de juegos · lab' })).toBeVisible();
    await page.getByRole('button', { name: 'Acierto', exact: true }).click();
    await page.getByRole('button', { name: 'Fallo grave' }).click();
    await axe(page, `games-lab ${w}px`);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(over, `desbordamiento a ${w}px`).toBeLessThanOrEqual(0);
  }
});

test('se juega solo con teclado: combo, pops con ▲▼, sonido silenciable y modo sin tiempo', async ({
  page,
}) => {
  await page.goto('/games-lab');
  const hit = page.getByRole('button', { name: 'Acierto', exact: true });
  await hit.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Enter');
  await expect(page.getByTestId('combo-meter').getByRole('status')).toHaveText('×3');
  await expect(page.getByText(/▲ \+120 XP/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fallo grave' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/▼ −3,2 %/)).toBeVisible();
  await expect(page.getByTestId('combo-meter').getByRole('status')).toHaveText('×1');

  await page.getByRole('checkbox', { name: 'Silenciar' }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'hit', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Sin sonido: hit')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Sin tiempo' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('untimed')).toHaveText('Modo sin tiempo: activado');
});

test('hit-stop: congela ~60 ms y se reanuda siempre', async ({ page }) => {
  await page.goto('/games-lab');
  await page.getByRole('button', { name: 'Hit-stop 60 ms' }).click();
  await expect(page.getByTestId('frozen')).toHaveText('Congelado');
  await expect(page.getByTestId('frozen')).toHaveText('Libre', { timeout: 1000 });
});

test('la pantalla de resultado estampa cada nota y anuncia lo aprendido', async ({ page }) => {
  await page.goto('/games-lab');
  for (const r of ['AAA', 'AA', 'A', 'BBB', 'BB', 'B']) {
    await page
      .getByRole('group', { name: 'Nota de ejemplo' })
      .getByRole('button', { name: r, exact: true })
      .click();
    await expect(page.getByTestId('rating')).toHaveText(r);
    await expect(page.getByTestId('rating')).toHaveAccessibleName(`Nota ${r}`);
  }
  await expect(
    page.getByRole('status').filter({ hasText: 'Diversificar reduce el riesgo' }),
  ).toBeVisible();
});

test('con reduced-motion: sin partículas ni movimiento, y la información sigue ahí', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/games-lab');
  await expect(page.getByTestId('reduced-state')).toContainText('sí');
  await page.getByRole('button', { name: 'Récord (partículas)' }).click();
  await page.waitForTimeout(150);
  const painted = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    return d.some((v) => v !== 0);
  });
  expect(painted).toBe(false);
  await page.getByRole('button', { name: 'Acierto', exact: true }).click();
  await expect(page.getByText(/▲ \+120 XP/)).toBeVisible();
  // el pop usa fundido, no traslación
  const anim = await page
    .getByText(/▲ \+120 XP/)
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('kit-fade');
  // el ticker no se anima
  const tick = await page
    .locator('.kit-ticker-track')
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(tick).toBe('none');
});

test('sin reduced-motion las partículas se dibujan y se apagan solas', async ({ page }) => {
  await page.goto('/games-lab');
  await page.getByRole('button', { name: 'Récord (partículas)' }).click();
  await page.waitForTimeout(120);
  const count = () =>
    page.evaluate(() => {
      const c = document.querySelector('canvas')!;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
      return n;
    });
  expect(await count()).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  expect(await count()).toBe(0);
});
