import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/* Cada tipo se completa SOLO con teclado (Tab, Espacio, Enter, flechas) y pasa axe en reposo y con feedback. */

const press = async (page: Page, times: number, key = 'Tab') => {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
};

/** Tab hasta enfocar el elemento que cumple el selector (máx. 60 pulsaciones). */
async function tabTo(page: Page, selector: string, text?: string) {
  for (let i = 0; i < 60; i++) {
    const hit = await page.evaluate(
      ([s, t]) => {
        const el = document.activeElement;
        return (
          !!el &&
          el.matches(s!) &&
          (!t || (el.textContent ?? '').includes(t) || el.getAttribute('aria-label') === t)
        );
      },
      [selector, text] as const,
    );
    if (hit) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`El foco no llegó a ${selector}`);
}

const axe = async (page: Page, label: string) => {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    label,
  ).toEqual([]);
};

const FLOWS: Record<string, (page: Page) => Promise<void>> = {
  multiple_choice: async (p) => {
    await tabTo(p, '[role="radio"]', 'Limitada');
    await p.keyboard.press('Space');
  },
  multi_select: async (p) => {
    for (const n of ['Comisión del bróker', 'Horquilla', 'Canon de bolsa']) {
      await tabTo(p, '[role="checkbox"]', n);
      await p.keyboard.press('Space');
    }
  },
  true_false_swipe: async (p) => {
    await tabTo(p, '[role="radio"]', 'Falso');
    await p.keyboard.press('Space');
  },
  match_pairs: async (p) => {
    for (const [l, r] of [
      ['TIN', 'Interés sin comisiones'],
      ['TAE', 'Coste efectivo anual'],
      ['Euríbor', 'Índice del tipo variable'],
    ]) {
      await tabTo(p, 'ul[aria-label="Elementos"] [role="checkbox"]', l);
      await p.keyboard.press('Space');
      await tabTo(p, 'ul[aria-label="Parejas"] [role="radio"]', r);
      await p.keyboard.press('Space');
    }
  },
  fill_blank: async (p) => {
    await tabTo(p, 'input');
    await p.keyboard.type('compuesto');
  },
  order_steps: async (p) => {
    const steps = [
      'Fijas el precio máximo',
      'La orden entra en el libro',
      'Aparece una venta a ese precio o menos',
      'Se ejecuta la operación',
    ];
    const order = async () =>
      p
        .locator('ol[aria-labelledby] > li')
        .evaluateAll(
          (lis, ss) => lis.map((li) => ss.findIndex((s) => li.textContent?.includes(s))),
          steps,
        );
    for (let target = 0; target < steps.length; target++) {
      for (let guard = 0; guard < 10 && (await order())[target] !== target; guard++) {
        await tabTo(p, 'button', `Subir «${steps[target]}»`);
        await p.keyboard.press('Space');
      }
    }
    expect(await order()).toEqual([0, 1, 2, 3]);
  },
  numeric_input: async (p) => {
    await tabTo(p, 'input');
    await p.keyboard.type('1.102,50');
  },
  build_statement: async (p) => {
    await tabTo(p, 'input[inputmode="decimal"]');
    await p.keyboard.type('5.152');
    await tabTo(p, 'input[inputmode="decimal"]:not([value="5.152"])');
    await p.keyboard.type('17731');
    await expect(p.getByText('✓ El balance cuadra')).toBeVisible();
  },
  spreadsheet: async (p) => {
    await tabTo(p, 'input[aria-label="Celda B3"]');
    await p.keyboard.type('=B1*(1+B2)');
    await expect(p.getByText('Resultado de B3: 1.050')).toBeVisible();
  },
  chart_read: async (p) => {
    await tabTo(p, '[role="radio"]', 'Normal: a más plazo');
    await p.keyboard.press('Space');
  },
  scenario: async (p) => {
    await tabTo(p, '[role="radio"]', 'Reservar un colchón');
    await p.keyboard.press('Space');
  },
  best_argument: async (p) => {
    await tabTo(p, '[role="radio"]', 'reduce el riesgo específico');
    await p.keyboard.press('Space');
  },
  spot_the_error: async (p) => {
    await tabTo(p, '[role="radio"]', '1.100 + 100');
    await p.keyboard.press('Space');
  },
  slider_estimate: async (p) => {
    await tabTo(p, 'input[type="range"]');
    // parte del punto medio (16); las flechas lo bajan hasta 10
    for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowLeft');
    await expect(p.locator('input[type="range"]')).toHaveValue('10');
  },
  case_step: async (p) => {
    await tabTo(p, '[role="radio"]', 'Su deuda y su caja');
    await p.keyboard.press('Space');
    await tabTo(p, 'button', 'Comprobar paso');
    await p.keyboard.press('Enter');
    await tabTo(p, 'button', 'Siguiente paso');
    await p.keyboard.press('Enter');
    await tabTo(p, '[role="radio"]', 'Ampliar capital');
    await p.keyboard.press('Space');
    await tabTo(p, 'button', 'Comprobar paso');
    await p.keyboard.press('Enter');
  },
  document_read: async (p) => {
    await tabTo(p, '[role="radio"]', 'Puede subir o bajar');
    await p.keyboard.press('Space');
  },
  self_explain: async (p) => {
    await tabTo(p, 'textarea');
    await p.keyboard.type('Los intereses se reinvierten y generan más intereses.');
    await tabTo(p, 'button', 'Ver respuesta modelo');
    await p.keyboard.press('Enter');
    await tabTo(p, 'input[type="checkbox"]');
    await p.keyboard.press('Space');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Space');
  },
  categorize: async (p) => {
    for (const [item, cat] of [
      ['Caja', 'Activo'],
      ['Deuda con el banco', 'Pasivo'],
      ['Clientes', 'Activo'],
      ['Proveedores', 'Pasivo'],
    ]) {
      await tabTo(p, `[role="group"][aria-label="${item}"] button`, cat);
      await p.keyboard.press('Space');
    }
  },
};

for (const [type, flow] of Object.entries(FLOWS)) {
  test(`${type}: se completa solo con teclado y pasa axe`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/exercises-lab?type=${type}`);
    await expect(page.getByRole('heading', { level: 3 })).toBeVisible();
    await axe(page, `${type} en reposo`);

    await flow(page);
    await tabTo(page, 'button', 'Comprobar');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').first()).toContainText('Correcto');
    await axe(page, `${type} con feedback`);

    await tabTo(page, 'button', 'Continuar');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('outcome')).toHaveText('Completado: correcto');
  });
}

test('en reposo ningún tipo tiene scroll horizontal a 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const type of Object.keys(FLOWS)) {
    await page.goto(`/exercises-lab?type=${type}`);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(over, type).toBeLessThanOrEqual(0);
  }
  void press;
});
