import { readFileSync, existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { playLesson, type Lesson as PlayLesson } from './play';
import { completeOnboarding, currentExercise, solve, type Ex } from './solver';

/* PWA contra la build de producción servida por un servidor propio, para poder cambiar sw.js
   y sw-control.json a mitad de test (versión nueva, interruptor de emergencia). */

const DIST = join(process.cwd(), 'dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let server: Server;
let base = '';
const state = { swSuffix: '', control: '{ "kill": false, "minVersion": "0.1.0" }' };

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0]!;
    let file = join(DIST, path === '/' ? 'index.html' : path);
    if (!existsSync(file)) file = join(DIST, 'index.html');
    let body: Buffer | string = readFileSync(file);
    if (path === '/sw.js') body = body.toString() + state.swSuffix;
    if (path === '/sw-control.json') body = state.control;
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(() => server.close());
test.beforeEach(() => {
  state.swSuffix = '';
  state.control = '{ "kill": false, "minVersion": "0.1.0" }';
});

type Lesson = { intro: unknown[]; exercises: Ex[] };
const lesson1: Lesson = JSON.parse(readFileSync('content/es/levels/n0/u1/l1.json', 'utf8'));

/** Registra el SW y espera a que controle la página (necesita una recarga tras la primera instalación). */
async function ready(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

test('manifest válido: campos, iconos que existen y theme-color', async ({ page, request }) => {
  await page.goto(`${base}/`);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const m = await (await request.get(`${base}${href}`)).json();
  expect(m).toMatchObject({
    name: 'Compuesto',
    short_name: 'Compuesto',
    lang: 'es',
    display: 'standalone',
    start_url: '/',
  });
  expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  for (const icon of m.icons as { src: string }[]) {
    const r = await request.get(`${base}/${icon.src}`);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
  }
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    /^#[0-9a-f]{6}$/i,
  );
});

test('sin conexión tras la primera carga: recarga y completa una lección entera', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await completeOnboarding(page, 'JAV', `${base}/`);
  await page.goto(`${base}/#/`);
  await page.reload(); // vuelve a Inicio
  await expect(page.getByTestId('xp-total')).toBeVisible();

  await context.setOffline(true);
  await page.reload(); // la app arranca desde la caché del SW
  await expect(page.getByTestId('xp-total')).toBeVisible();
  await expect(page.getByText(/Sin conexión/)).toBeVisible();

  await page.getByRole('button', { name: /Abrir mercado|Continuar/ }).click();
  for (let i = 0; i < lesson1.intro.length; i++) {
    await page
      .getByRole('button', {
        name: i === lesson1.intro.length - 1 ? 'Empezar los ejercicios' : 'Siguiente',
        exact: true,
      })
      .click();
  }
  const closing = page.getByRole('heading', { name: 'Lección completada' });
  const check = page.getByRole('button', { name: 'Comprobar' });
  for (;;) {
    await expect(check.or(closing)).toBeVisible();
    if (await closing.count()) break;
    await solve(page, await currentExercise(page, lesson1.exercises));
    await check.click();
    await expect(page.getByRole('status').filter({ hasText: 'Correcto' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByTestId('xp-total')).toHaveText('100'); // 8×10 + 20; sin red, guardado en local
  expect(errors).toEqual([]);
});

test('versión nueva: aviso fuera de las lecciones, nunca a mitad de una, y solo actualiza al pulsar', async ({
  page,
}) => {
  await ready(page);
  await completeOnboarding(page, 'JAV', `${base}/`);
  await page.goto(`${base}/#/leccion/n0-u1-l1`);
  await page.evaluate(() => ((window as unknown as { __v1: boolean }).__v1 = true));

  state.swSuffix = '\n// versión 2\n';
  await page.evaluate(() =>
    navigator.serviceWorker.getRegistration().then((r) => r?.update().then(() => undefined)),
  );
  // espera a que la versión nueva esté instalada y en espera
  await page.waitForFunction(() =>
    navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting),
  );
  // con la lección abierta no aparece ni se recarga
  await page.waitForTimeout(500);
  await expect(page.getByText('Nueva versión disponible')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __v1?: boolean }).__v1)).toBe(true);

  // al volver a Inicio, el aviso está ahí y no se ha recargado nada
  await page.goto(`${base}/#/`);
  await expect(page.getByText('Nueva versión disponible')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __v1?: boolean }).__v1)).toBe(true);

  await page.getByRole('button', { name: 'Actualizar' }).click();
  await page.waitForFunction(() => !(window as unknown as { __v1?: boolean }).__v1);
  await expect(page.getByTestId('xp-total')).toBeVisible();
  await expect(page.getByText('Nueva versión disponible')).toHaveCount(0);
});

test('"Más tarde" oculta el aviso sin actualizar', async ({ page }) => {
  await ready(page);
  await completeOnboarding(page, 'JAV', `${base}/`);
  await page.goto(`${base}/#/`);
  state.swSuffix = '\n// versión 3\n';
  await page.evaluate(() =>
    navigator.serviceWorker.getRegistration().then((r) => r?.update().then(() => undefined)),
  );
  await expect(page.getByText('Nueva versión disponible')).toBeVisible();
  await page.getByRole('button', { name: 'Más tarde' }).click();
  await expect(page.getByText('Nueva versión disponible')).toHaveCount(0);
});

test('interruptor de emergencia: desregistra el service worker y vacía las cachés', async ({
  page,
}) => {
  await ready(page);
  expect(await page.evaluate(() => caches.keys().then((k) => k.length))).toBeGreaterThan(0);

  state.control = '{ "kill": true, "minVersion": "0.1.0" }';
  await page.reload();
  await expect
    .poll(
      () =>
        page.evaluate(async () => ({
          regs: (await navigator.serviceWorker.getRegistrations()).length,
          caches: (await caches.keys()).length,
        })),
      { timeout: 15_000 },
    )
    .toEqual({ regs: 0, caches: 0 });
  await expect(page.locator('#root')).not.toBeEmpty(); // la app sigue funcionando sin SW
});

test('el panel de Ajustes explica la instalación y el estado sin conexión', async ({ page }) => {
  await ready(page);
  await completeOnboarding(page, 'JAV', `${base}/`);
  await page.goto(`${base}/#/despacho/ajustes`);
  await expect(page.getByRole('heading', { name: 'Instalar Compuesto' })).toBeVisible();
  await expect(page.getByTestId('offline-status')).toHaveText('Lista para usar sin conexión.');
});

test('iPhone sin instalar: pasos de «Añadir a pantalla de inicio» y aviso de los 7 días', async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 812 },
  });
  const page = await ctx.newPage();
  await completeOnboarding(page, 'JAV', `${base}/`);
  await page.goto(`${base}/#/despacho/ajustes`);
  await expect(
    page.getByText(/borrar los datos de una web que no se visita en 7 días/),
  ).toBeVisible();
  await expect(page.getByText(/Añadir a pantalla de inicio/)).toBeVisible();
  await page.screenshot({ path: 'docs/capturas/1.8/ios-instalar.png', fullPage: true });
  await ctx.close();
});

test('flujo completo: onboarding → 3 lecciones sin conexión → recarga → progreso intacto', async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await completeOnboarding(page, 'JAV', `${base}/`);
  await page.goto(`${base}/#/`);
  await page.reload();
  await expect(page.getByTestId('xp-total')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  const lessons: PlayLesson[] = [1, 2, 3].map((n) =>
    JSON.parse(readFileSync(`content/es/levels/n0/u1/l${n}.json`, 'utf8')),
  );
  for (const l of lessons) {
    await page.goto(`${base}/#/leccion/${l.id}`);
    await expect(page.getByRole('heading', { name: l.title })).toBeVisible();
    await playLesson(page, l);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByTestId('xp-total')).toBeVisible();
  }
  const xp = await page.getByTestId('xp-total').innerText();
  expect(Number(xp.replace(/\./g, ''))).toBeGreaterThanOrEqual(300);

  // recarga (todavía sin conexión): el progreso sigue ahí
  await page.reload();
  await expect(page.getByTestId('xp-total')).toHaveText(xp);
  await expect(page.getByTestId('streak')).toHaveText('1 d');
  await page.goto(`${base}/#/camino`);
  await expect(page.getByRole('group', { name: /El dinero en el tiempo/ })).toContainText(
    '▶ En curso',
  );
  expect(errors).toEqual([]);
});
