import { expect, test } from '@playwright/test';

test('la app abre y muestra Compuesto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Compuesto' })).toBeVisible();
});
