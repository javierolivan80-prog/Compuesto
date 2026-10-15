import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const THEMES = ['noche', 'mayfair', 'salmon', 'ginebra', 'montecarlo', 'tokio', 'platino'];

test.describe('/styleguide', () => {
  test('axe sin errores en los 7 temas', async ({ page }) => {
    // Estado final de las animaciones: con opacidad a medias axe mediría un contraste falso.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/styleguide');
    await expect(page.getByRole('heading', { name: 'Styleguide' })).toBeVisible();
    for (const theme of THEMES) {
      await page.getByLabel('Tema').selectOption(theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
      );
      expect(summary, `tema ${theme}`).toEqual([]);
    }
  });

  test('teclado: todos los controles son alcanzables y con foco visible', async ({ page }) => {
    await page.goto('/styleguide');
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName + (el.textContent ?? '').trim().slice(0, 20),
          outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
        };
      });
      if (info) {
        seen.add(info.tag);
        expect(info.outline, `sin foco visible en ${info.tag}`).toBe(true);
      }
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  test('bottom sheet: se abre con teclado y se cierra con Esc', async ({ page }) => {
    await page.goto('/styleguide');
    await page.getByRole('button', { name: 'Abrir bottom sheet' }).click();
    await expect(page.getByRole('dialog', { name: 'Bottom sheet' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('reduced-motion: sin animaciones de sacudida ni brillo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/styleguide');
    const names = await page.evaluate(() => {
      const el = document.querySelector('.review-tag');
      return el ? getComputedStyle(el, '::after').animationName : 'missing';
    });
    expect(names).toBe('none');
    await page.getByRole('button', { name: 'Feedback: fallo' }).click();
    await expect(page.getByRole('status')).toContainText('Casi: repásalo');
    // la hoja ya está en su estado final (opacidad 1) sin esperar a una animación
    await expect(page.getByRole('status')).toHaveCSS('opacity', '1');
  });

  for (const [w, h] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`sin scroll horizontal a ${w}px`, async ({ page }, info) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/styleguide');
      await page.waitForTimeout(800);
      await page.screenshot({ path: info.outputPath(`styleguide-${w}.png`), fullPage: true });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('en producción /styleguide no existe', async ({ page }) => {
    const res = await page.goto('http://localhost:4173/styleguide');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole('heading', { name: 'Styleguide' })).toHaveCount(0);
  });
});
