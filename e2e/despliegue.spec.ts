import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { completeOnboarding } from './solver';

/* Tarea 2.8: la app funciona con las cabeceras reales de despliegue (public/_headers), incluida la CSP,
   y la URL no se indexa. `vite preview` no lee _headers, así que se inyectan al servir cada respuesta. */

function parseHeaders(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  let cur: Record<string, string> | null = null;
  for (const raw of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!raw.startsWith(' ')) cur = out[raw.trim()] = {};
    else if (cur) {
      const i = raw.indexOf(':');
      cur[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
    }
  }
  return out;
}

test('con las cabeceras de despliegue (CSP incluida) la app arranca, enseña y no hay violaciones', async ({
  page,
}) => {
  const rules = parseHeaders();
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  await page.route('**/*', async (route) => {
    const res = await route.fetch();
    const path = new URL(route.request().url()).pathname;
    const headers = { ...res.headers(), ...rules['/*'] };
    if (path.startsWith('/assets/')) Object.assign(headers, rules['/assets/*']);
    if (rules[path]) Object.assign(headers, rules[path]);
    await route.fulfill({ response: res, headers });
  });
  await completeOnboarding(page);
  await page.goto('/#/practicar');
  await expect(page.getByRole('heading', { name: 'Minijuegos' })).toBeVisible();
  await page.goto('/#/despacho/compartir');
  await expect(page.getByRole('heading', { name: 'Compartir mi progreso' })).toBeVisible();
  // la tarjeta se genera con html-to-image (data:, blob:, fuentes propias): la CSP no debe romperla
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Descargar PNG' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  expect(violations).toEqual([]);
});

test('la URL no se indexa: robots.txt, meta robots y X-Robots-Tag', async ({ page, request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow:\s*\/\s*$/m);
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(parseHeaders()['/*']?.['X-Robots-Tag']).toMatch(/noindex/);
  expect(parseHeaders()['/sw.js']?.['Cache-Control']).toMatch(/no-store/);
  expect(parseHeaders()['/sw-control.json']?.['Cache-Control']).toMatch(/no-store/);
});
