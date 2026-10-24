import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { WORST_SEEDS } from '../src/features/games/worst-seeds';
import { playGameLesson, type GameLesson } from './play-game';
import { completeOnboarding } from './solver';

/*
 * break-ui de las lecciones-juego de la planta 0: semilla con las cifras más extremas (`?datos=peor`, solo en
 * desarrollo), 320 px y texto al 200 %. Durante toda la partida y la lección se vigila el desbordamiento horizontal.
 */

const LESSONS = [
  'n1/u1/l6',
  'n1/u4/l7',
  'n1/u4/l8',
  'n1/u3/l6',
  'n1/u5/l7',
  'n1/u2/l6',
  'n1/u6/l7',
  'n3/u1/l1',
  'n3/u2/l1',
  'n3/u3/l1',
  'n3/u4/l1',
  'n3/u5/l1',
  'n3/u6/l1',
  'n2/u1/l1',
  'n2/u2/l1',
  'n2/u3/l1',
  'n2/u4/l1',
  'n2/u5/l1',
  'n2/u6/l1',
  'n2/u7/l1',
  'n4/u1/l1',
  'n4/u2/l1',
  'n4/u3/l1',
  'n4/u4/l1',
  'n4/u5/l1',
  'n4/u6/l1',
] as const;

async function watchOverflow(page: Page, textZoom: boolean) {
  await page.addInitScript((zoom) => {
    const w = window as unknown as { __over: { px: number; who: string }[] };
    w.__over = [];
    const check = () => {
      const over = document.documentElement.scrollWidth - window.innerWidth;
      {
        // el elemento que más sobresale por la derecha (con su borde derecho), para saber qué arreglar
        let max = 0;
        let who = '?';
        const clipped = (el: Element) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true;
          }
          return false;
        };
        for (const el of document.querySelectorAll('body *')) {
          if (clipped(el)) continue;
          const r = el.getBoundingClientRect().right;
          if (r > max && r > window.innerWidth + 0.5) {
            max = r;
            who = `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} «${(el.textContent ?? '').slice(0, 30)}» → ${Math.round(r)}`;
          }
        }
        // paneles cuyo contenido invade su relleno derecho (una columna estirada por un hijo demasiado ancho)
        for (const el of document.querySelectorAll('section')) {
          const box = el.getBoundingClientRect();
          if (!box.width) continue;
          const inner = box.right - parseFloat(getComputedStyle(el).paddingRight);
          for (const child of el.children) {
            // las capas absolutas (puntos flotantes, brillos) ocupan el panel entero a propósito
            if (['absolute', 'fixed'].includes(getComputedStyle(child).position)) continue;
            const r = (child as HTMLElement).getBoundingClientRect();
            if (r.width && r.right > inner + 1)
              w.__over.push({
                px: Math.round(r.right - inner),
                who: `relleno de «${(el.textContent ?? '').slice(0, 20)}»`,
              });
          }
        }
        // cifras que no caben en su celda y se pisan con la siguiente
        for (const el of document.querySelectorAll(
          '[role=cell], [role=columnheader], dd, section',
        )) {
          const e = el as HTMLElement;
          if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0)
            w.__over.push({
              px: e.scrollWidth - e.clientWidth,
              who: `celda «${(e.textContent ?? '').slice(0, 20)}»`,
            });
        }
        if (over <= 0) return;
        if (who === '?') {
          // ningún elemento visible sobresale: dejar constancia de la pantalla para buscarlo
          const h = document.querySelector('h2, h1')?.textContent ?? '';
          const st = document.querySelector('[role=status]')?.textContent ?? '';
          who = `? en «${h.slice(0, 30)}» / «${st.slice(0, 40)}» ${location.hash}`;
        }
        w.__over.push({ px: over, who });
      }
    };
    window.addEventListener('DOMContentLoaded', () => {
      if (zoom) document.documentElement.style.fontSize = '200%';
      new MutationObserver(check).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    });
  }, textZoom);
}
const overflows = (page: Page) =>
  page.evaluate(() => (window as unknown as { __over: { px: number; who: string }[] }).__over);

for (const zoom of [false, true])
  for (const path of LESSONS)
    // texto al 200 % en 640 px equivale al reflujo a 320 px de WCAG 1.4.10; 320 px sin zoom es el móvil más estrecho
    test(`peor caso a ${zoom ? '640 px con texto al 200 %' : '320 px'}: ${path}`, async ({
      page,
    }) => {
      test.setTimeout(150_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: zoom ? 640 : 320, height: 640 });
      await watchOverflow(page, zoom);
      await completeOnboarding(page, 'JAV', '/?datos=peor');
      const lesson = JSON.parse(
        readFileSync(`content/es/levels/${path}.json`, 'utf8'),
      ) as GameLesson;
      await page.goto(`/?datos=peor#/leccion/${lesson.id}`);
      await page.reload();
      await expect(page.getByTestId('dev-data-toggle')).toBeVisible();
      const worst = { ...lesson, game: { ...lesson.game, seed: WORST_SEEDS[lesson.game.kind] } };
      const name = path.replaceAll('/', '-');
      await page.screenshot({
        path: `docs/capturas/peor-caso/${name}${zoom ? '-200' : ''}-juego.png`,
        fullPage: true,
      });
      await playGameLesson(page, worst);
      await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
      const found = await overflows(page);
      expect(found.slice(0, 3), 'desbordamiento horizontal').toEqual([]);
    });

test('teclado solo: el deslizador del índice y el libro de la salida a bolsa', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u3-l6');
  const slider = page.getByLabel('¿Cuánto se mueve hoy el índice?');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('im-guess')).toHaveText('▲ +0,2 %');
  await page.keyboard.press('Tab'); // botón «+»
  await page.keyboard.press('Tab'); // «Ver el cierre»
  await expect(page.getByRole('button', { name: 'Ver el cierre' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toBeVisible();

  await page.goto('/#/leccion/n1-u2-l6');
  await page.getByRole('button', { name: 'Abrir el libro de demanda' }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio').first()).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); // 10,25 €
  await expect(page.getByRole('radio', { name: /^10,25/ })).toHaveAttribute('aria-checked', 'true');
});
