import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './solver';

/* Pantallas principales (tarea 1.7) contra la build de producción: navegación, axe, estados, offline,
   capturas a 375/768/1440 px y que ningún control visible sea un botón sin acción. */

const ROUTES = [
  ['#/', 'inicio'],
  ['#/camino', 'camino'],
  ['#/practicar', 'practicar'],
  ['#/rivales', 'rivales'],
  ['#/despacho', 'despacho'],
  ['#/despacho/ajustes', 'ajustes'],
  ['#/despacho/glosario', 'glosario'],
  ['#/despacho/reportes', 'reportes'],
] as const;

async function ready(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/');
  await expect(page.getByTestId('xp-total')).toBeVisible();
}

const scan = async (page: Page, label: string) => {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    label,
  ).toEqual([]);
};

test('la barra de 5 pestañas navega y marca la pestaña activa; Glosario y Ajustes cuelgan de Despacho', async ({
  page,
}) => {
  await ready(page);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(nav.getByRole('link')).toHaveText([
    'Inicio',
    'Camino',
    'Practicar',
    'Rivales',
    'Despacho',
  ]);
  for (const tab of ['Camino', 'Practicar', 'Rivales', 'Despacho', 'Inicio']) {
    await nav.getByRole('link', { name: tab }).click();
    await expect(nav.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
  }
  await nav.getByRole('link', { name: 'Despacho' }).click();
  await page.getByRole('link', { name: 'Ajustes' }).click();
  await expect(nav.getByRole('link', { name: 'Despacho' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await page.getByRole('link', { name: '← Despacho' }).click();
  await expect(page.getByRole('heading', { name: 'Despacho' })).toBeVisible();
});

test('en una lección y en un test de salto la barra de pestañas se oculta (pantalla completa)', async ({
  page,
}) => {
  await ready(page);
  await page.goto('/#/leccion/n0-u1-l1');
  await expect(
    page.getByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
  await page.goto('/#/salto/n0-u1');
  await expect(page.getByRole('heading', { name: 'Test de salto' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
});

for (const theme of ['Wall Street Noche', 'Mayfair']) {
  test(`axe sin errores en las 8 pantallas con el tema ${theme}`, async ({ page }) => {
    await ready(page);
    await page.goto('/#/despacho/ajustes');
    await page.getByRole('button', { name: theme }).click();
    for (const [hash, name] of ROUTES) {
      await page.goto(`/${hash}`);
      await expect(
        page
          .getByRole('heading', { level: 1 })
          .or(page.getByRole('heading', { name: 'Objetivo de hoy' }))
          .first(),
      ).toBeVisible();
      await scan(page, `${name} (${theme})`);
    }
  });
}

test('capturas de cada pantalla a 375, 768 y 1440 px, sin scroll horizontal', async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
  for (const [w, h] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [hash, name] of ROUTES) {
      await page.goto(`/${hash}`);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `docs/capturas/1.7/${name}-${w}.png`, fullPage: true });
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(over, `${name} a ${w}px`).toBeLessThanOrEqual(0);
    }
  }
});

test('ningún botón o enlace visible es un control sin acción (recorre todos los de cada pantalla)', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await ready(page);
  const flags = { side: false };
  page.on('download', () => (flags.side = true));
  page.on('filechooser', () => (flags.side = true));
  // estado observable: DOM completo (atributos aria incluidos), valores de formularios, tema y ruta
  const snapshot = () =>
    page.evaluate(() => {
      const forms = [...document.querySelectorAll('input,select,textarea')]
        .map(
          (e) =>
            `${(e as HTMLInputElement).type}:${(e as HTMLInputElement).checked}:${(e as HTMLInputElement).value}`,
        )
        .join('|');
      return `${location.hash}\n${document.documentElement.dataset.theme}\n${forms}\n${document.body.innerHTML}`;
    });
  void context;
  const dead: string[] = [];
  for (const [hash, name] of ROUTES) {
    await page.goto(`/${hash}`);
    await page.waitForTimeout(300);
    // una opción ya seleccionada (aria-pressed=true) no cambia nada al volver a pulsarla: es el comportamiento de un grupo de opciones
    const selector =
      'main button:not([disabled]):not([aria-pressed="true"]), main a[href], main summary, nav a[href]:not([aria-current="page"])';
    const count = await page.locator(selector).count();
    expect(count, `controles en ${name}`).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      // una recarga limpia cualquier hoja o diálogo que dejara abierto el control anterior
      await page.goto(`/${hash}`);
      await page.reload();
      await page.waitForTimeout(150);
      const el = page.locator(selector).nth(i);
      if (!(await el.isVisible())) continue;
      const label = (
        (await el.innerText().catch(() => '')) ||
        (await el.getAttribute('aria-label')) ||
        `#${i}`
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 50);
      flags.side = false;
      const before = await snapshot();
      await el.click({ timeout: 5000 });
      await page.waitForTimeout(350);
      const after = await snapshot();
      if (before === after && !flags.side) dead.push(`${name}: «${label}»`);
    }
  }
  expect(dead, 'controles sin efecto observable').toEqual([]);
});

test('estados vacíos: sin fallos, sin reportes y sin lecciones completadas', async ({ page }) => {
  await ready(page);
  await page.goto('/#/despacho');
  await expect(page.getByText('Sin fallos registrados')).toBeVisible();
  await page.goto('/#/despacho/reportes');
  await expect(page.getByText('No hay reportes')).toBeVisible();
  await page.goto('/#/practicar');
  await expect(page.getByText('Todavía no has completado ninguna lección')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Repaso espaciado y minijuegos' })).toBeVisible();
  await page.goto('/#/rivales');
  await expect(page.getByText('Próximamente')).toBeVisible();
  await expect(page.locator('main').getByRole('button')).toHaveCount(0);
});

test('offline: avisa pero la app sigue funcionando y guardando', async ({ page, context }) => {
  await ready(page);
  // sin conexión solo es posible tras la primera carga: espera a que el service worker haya precacheado la app
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await expect(page.getByText(/Sin conexión\. Compuesto funciona igual/)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Camino' })
    .click();
  await expect(page.getByRole('heading', { name: 'Camino' })).toBeVisible();
  await page.goto('/#/leccion/n0-u1-l1').catch(() => undefined);
  await expect(
    page.getByRole('heading', { name: 'Inflación: por qué tu dinero compra menos' }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/Sin conexión/)).toHaveCount(0);
});

test('error: si no se puede leer el almacenamiento se avisa con un error y reintento, sin pantalla rota', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // simula IndexedDB bloqueada (p. ej. modo privado antiguo o permisos)
    Object.defineProperty(window, 'indexedDB', {
      get: () => {
        throw new Error('IndexedDB bloqueada');
      },
    });
  });
  await page.goto('/#/camino');
  await expect(page.getByRole('alert')).toContainText('Error: no se pudo leer tu progreso');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
});
