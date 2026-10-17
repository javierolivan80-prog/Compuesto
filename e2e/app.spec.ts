import { expect, test } from '@playwright/test';

test('la app abre en producción sin errores y sincroniza theme-color', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Compuesto' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mayfair');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f9f3e7');
  expect(errors).toEqual([]);
});
