import { expect, test } from '@playwright/test';

test('la app abre en producción sin errores y sincroniza theme-color', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Compuesto' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'noche');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#080e16');
  expect(errors).toEqual([]);
});
