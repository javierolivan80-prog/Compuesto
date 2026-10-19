import { expect, type Page } from '@playwright/test';
import type { Exercise } from '../src/content/schemas';
import { readFileSync } from 'node:fs';
import { setupBalance, SIDE_OF, type ItemId } from '../src/engine/games/balance-builder';
import { bestPlan, setupCash } from '../src/engine/games/cash-cycle';
import { setupDetective } from '../src/engine/games/ratio-detective';
import { rightVerdict, setupCheap } from '../src/engine/games/cheap-or-dear';
import { bestWeight, CURRENT, leveredBeta, setupWacc } from '../src/engine/games/wacc-mix';
import { BASE, bossGrowth, impliedWacc, setupDcf, START_3 } from '../src/engine/games/dcf-express';
import { required, setupBond } from '../src/engine/games/bond-issue';
import { fall10, setupCurve } from '../src/engine/games/yield-curve';
import { rightDiff, setupFunds, SITUATIONS } from '../src/engine/games/fund-fees';
import { mean as luckMean, setupLuck } from '../src/engine/games/luck-or-skill';
import { dollars, rightCompare, setupFx } from '../src/engine/games/fx-trip';
import { BROKERS, cheapestBroker, setupDividend } from '../src/engine/games/dividend-day';
import { formatNumber } from '../src/lib/format';
import { setupFirstShares } from '../src/engine/games/first-shares';
import { outcomeAt, PRICES, setupIpo } from '../src/engine/games/ipo-book';
import { playSessions, setupIndex } from '../src/engine/games/index-mover';
import { referenceValues, type LessonGameKind } from '../src/engine/games/lesson-games';
import { instantiate, isParametric } from '../src/engine/params';
import { playLesson, type Lesson } from './play';
import type { Ex } from './solver';

const es = JSON.parse(readFileSync('src/i18n/es.json', 'utf8')) as {
  balanceGame: { side: Record<string, string>; item: Record<string, string> };
  cashGame: { opt: Record<string, Record<string, string>> };
};

export type GameLesson = Lesson & { game: { kind: LessonGameKind; seed: number } };

/**
 * Lección-juego por la interfaz: juega la partida de referencia 0 del juego (la que content:validate ya comprueba),
 * pasa a la explicación y resuelve los ejercicios con las cifras de esa partida.
 */
export async function playGameLesson(
  page: Page,
  lesson: GameLesson,
  opts: Parameters<typeof playLesson>[2] = {},
) {
  const { kind, seed } = lesson.game;
  if (kind === 'block-trade') {
    // referencia 0: las 600 de golpe a mercado
    await expect(page.getByRole('heading', { name: 'La compra grande' })).toBeVisible();
    await page.getByRole('button', { name: /^Lo que queda/ }).click();
    await page.getByRole('button', { name: /^Comprar \d+ a mercado$/ }).click();
  } else if (kind === 'fx-trip') {
    // referencia 0: los dólares, el efecto de la divisa y la cobertura
    await expect(page.getByRole('heading', { name: 'El viaje del dólar' })).toBeVisible();
    const setup = setupFx(seed);
    const usd = formatNumber(Math.round(dollars(setup))).replace('.', '\\.');
    await page.getByRole('radio', { name: new RegExp(`^${usd}\\s\\$$`) }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page
      .getByRole('radio', { name: new RegExp(rightCompare(setup) === 'less' ? '^Menos' : '^Más') })
      .click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: /^La cubierta/ }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'luck-or-skill') {
    // referencia 0: media, volatilidad, colas y no creerse el genio
    await expect(page.getByRole('heading', { name: '¿Suerte o habilidad?' })).toBeVisible();
    const m = formatNumber(Math.round(luckMean(setupLuck(seed).a) * 100) / 100, 2);
    await page.getByRole('radio', { name: new RegExp(`^${m}\\s%$`) }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: 'El fondo B' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: /^Bastante más a menudo/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: /^No:/ }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'fund-fees') {
    // referencia 0: la diferencia buena, los cuatro vehículos bien y el traspaso
    await expect(page.getByRole('heading', { name: 'Dos fondos, veinte años' })).toBeVisible();
    const diff = formatNumber(rightDiff(setupFunds(seed)), 0).replace('.', '\\.');
    await page.getByRole('radio', { name: new RegExp(`^Unos ${diff}`) }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    for (const [i, x] of SITUATIONS.entries())
      await page
        .getByRole('radiogroup')
        .nth(i)
        .getByRole('radio', { name: x.right === 'etf' ? 'ETF' : 'Fondo', exact: true })
        .click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: /^Traspaso/ }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'yield-curve') {
    // referencia 0: +1 punto en todos los plazos, aplanar 1 punto y la caída buena del bono a 10 años
    await expect(page.getByRole('heading', { name: 'Curva de tipos' })).toBeVisible();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Subir todos los tipos' }).click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Siguiente reto' }).click();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Aplanar la curva' }).click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Siguiente reto' }).click();
    await page
      .getByRole('radio', {
        name: new RegExp(`^Un ${formatNumber(fall10(setupCurve(seed)), 1)}\\s%$`),
      })
      .click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'bond-issue') {
    // referencia 0: cupón a la par, dirección del precio y TIR bien (el cupón empieza en el 3 %)
    await expect(page.getByRole('heading', { name: 'La emisión de Naranjas' })).toBeVisible();
    const setup = setupBond(seed);
    const y = required(setup);
    const n = Math.round((y - 3) * 10);
    for (let i = 0; i < Math.abs(n); i++)
      await page.getByRole('button', { name: n > 0 ? 'Subir el cupón' : 'Bajar el cupón' }).click();
    await page.getByRole('button', { name: /^Emitir con un cupón/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: setup.shock < 0 ? '▲ Sube' : '▼ Baja' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page
      .getByRole('radio', { name: new RegExp(`^${formatNumber(y + setup.shock, 2)}\\s%$`) })
      .click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'dcf-express') {
    // referencia 0: WACC implícito, g del jefe sin defenderla y el caso base del modelo aprobado
    await expect(page.getByRole('heading', { name: 'DCF Express' })).toBeVisible();
    const setup = setupDcf(seed);
    // mueve una palanca con sus botones −/+ (pasos de 0,1 en WACC y g, de 0,5 en el margen)
    const move = async (from: number, to: number, step: number, less: string, more: string) => {
      const n = Math.round((to - from) / step);
      for (let i = 0; i < Math.abs(n); i++)
        await page.getByRole('button', { name: n > 0 ? more : less }).click();
    };
    const wacc0 = Math.round(BASE.wacc * 10) / 10;
    await move(wacc0, impliedWacc(setup), 0.1, 'Bajar el WACC', 'Subir el WACC');
    await page.getByRole('button', { name: /^Proponer un WACC/ }).click();
    await page.getByRole('button', { name: 'Siguiente reto' }).click();
    await move(BASE.g, bossGrowth(setup), 0.1, 'Bajar g', 'Subir g');
    await page.getByRole('button', { name: /^Proponer g/ }).click();
    await page.getByRole('radio', { name: /^No:/ }).click();
    await page.getByRole('button', { name: 'Siguiente reto' }).click();
    await move(START_3.wacc, wacc0, 0.1, 'Bajar el WACC', 'Subir el WACC');
    await move(START_3.g, BASE.g, 0.1, 'Bajar g', 'Subir g');
    await move(START_3.margin, 0, 0.5, 'Bajar el margen', 'Subir el margen');
    await page.getByRole('button', { name: 'Presentar al comité' }).click();
  } else if (kind === 'wacc-mix') {
    // referencia 0: la beta apalancada bien y la estructura con el WACC mínimo
    await expect(page.getByRole('heading', { name: 'La mezcla de la financiación' })).toBeVisible();
    const setup = setupWacc(seed);
    await page
      .getByRole('radio', { name: formatNumber(leveredBeta(setup, CURRENT), 2), exact: true })
      .click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    const best = bestWeight(setup);
    const step = best > CURRENT ? 'Más deuda' : 'Menos deuda';
    for (let w = CURRENT; w !== best; w += best > CURRENT ? 5 : -5)
      await page.getByRole('button', { name: step }).click();
    await page.getByRole('button', { name: `Proponer un ${best} % de deuda` }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'cheap-or-dear') {
    // referencia 0: la mediana y el veredicto correcto en las tres empresas
    await expect(page.getByRole('heading', { name: '¿Cara o barata?' })).toBeVisible();
    const setup = setupCheap(seed);
    const label = { cheap: 'Barata', fair: 'En precio', dear: 'Cara' } as const;
    for (const [i, c] of setup.cases.entries()) {
      await page.getByRole('radio', { name: /^La mediana/ }).click();
      await page.getByRole('radio', { name: label[rightVerdict(c)], exact: true }).click();
      await page
        .getByRole('button', {
          name: i === setup.cases.length - 1 ? 'Ver el resumen' : 'Siguiente empresa',
        })
        .click();
    }
  } else if (kind === 'ratio-detective') {
    // referencia 0: acertar las cinco sin pedir ratios
    await expect(page.getByRole('heading', { name: '¿Quién es quién?' })).toBeVisible();
    const setup = setupDetective(seed);
    for (const [i, c] of setup.cards.entries()) await page.locator('select').nth(i).selectOption(c);
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'cash-cycle') {
    // referencia 0: el mejor plan
    await expect(page.getByRole('heading', { name: 'Ciclo de caja' })).toBeVisible();
    const setup = setupCash(seed);
    const best = bestPlan(setup);
    const opt = es.cashGame.opt;
    for (const k of ['dso', 'dio', 'dpo'] as const) {
      await page.getByRole('radio', { name: opt[k]![String(best[k])]!, exact: true }).click();
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    }
    if (best.shortfall > 0) {
      const label = opt
        .funding![best.funding]!.replace('{{rate}}', String(setup.rate))
        .replace('{{fee}}', formatNumber(setup.fee, 2));
      await page.getByRole('radio', { name: label, exact: true }).click();
      await page.getByRole('button', { name: 'Cerrar el plan y ver el año' }).click();
    }
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'balance-builder') {
    // referencia 0: colocar bien las ocho partidas y elegir el apunte correcto de las cinco operaciones
    await expect(page.getByRole('heading', { name: 'Cuadra el balance' })).toBeVisible();
    const setup = setupBalance(seed);
    const side = es.balanceGame.side;
    for (const id of setup.order)
      await page.getByRole('button', { name: side[SIDE_OF[id]], exact: true }).click();
    for (const [i, op] of setup.ops.entries()) {
      const entry = Object.entries(op.options[op.right]!) as [ItemId, number][];
      const label = entry
        .map(
          ([k, v]) => `${es.balanceGame.item[k]} ${v >= 0 ? '+' : '−'}${formatNumber(Math.abs(v))}`,
        )
        .join(' · ');
      await page.getByRole('button', { name: label, exact: true }).click();
      await page
        .getByRole('button', {
          name: i === setup.ops.length - 1 ? 'Ver el balance final' : 'Siguiente operación',
        })
        .click();
    }
  } else if (kind === 'takeover-rumor') {
    // referencia 0: no comprar por el rumor, no operar con la confidencia y acudir a la OPA
    await expect(page.getByRole('heading', { name: 'El rumor de OPA' })).toBeVisible();
    await page.getByRole('button', { name: /^No hacer nada/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: /^No operar, no contárselo/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: /^Esperar y acudir a la OPA/ }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'ipo-book') {
    // referencia 0: el primer precio que se cubre, de abajo arriba (9,00 €)
    await expect(page.getByRole('heading', { name: 'La salida a bolsa' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir el libro de demanda' }).click();
    const first = PRICES.find((p) => outcomeAt(setupIpo(seed), p) !== 'failed')!;
    const label = first.toFixed(2).replace('.', ',');
    await page.getByRole('radio', { name: new RegExp(`^${label}`) }).click();
    await page.getByRole('button', { name: new RegExp(`^Fijar el precio en ${label}`) }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'dividend-day') {
    // referencia 0: el bróker más barato, sin cazar el dividendo y acertando la fecha ex
    await expect(page.getByRole('heading', { name: 'El primer dividendo' })).toBeVisible();
    const s = setupDividend(seed);
    const name = { llave: 'Llave Valores', fijo: 'Fijo Bolsa', banco: 'Ancla Inversión' }[
      BROKERS[cheapestBroker(s)]!.id
    ];
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: /^No hacer nada/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: /^El cierre menos el dividendo/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Pasar un mes y vender' }).click();
  } else if (kind === 'index-mover') {
    // referencia 0: clavar las cuatro sesiones
    await expect(page.getByRole('heading', { name: '¿Quién mueve el índice?' })).toBeVisible();
    const out = playSessions(setupIndex(seed));
    for (const [i, o] of out.entries()) {
      await page
        .getByLabel('¿Cuánto se mueve hoy el índice?')
        .fill(String(Math.round(o.pct * 10) / 10));
      await page.getByRole('button', { name: 'Ver el cierre' }).click();
      await page
        .getByRole('button', {
          name: i === out.length - 1 ? 'Ver el resultado' : 'Siguiente sesión',
        })
        .click();
    }
  } else if (kind === 'opening-auction') {
    // referencia 0: a mercado desde las 8:30
    await expect(page.getByRole('heading', { name: 'La subasta de apertura' })).toBeVisible();
    await page.getByRole('button', { name: 'A mercado' }).click();
    await page.getByRole('button', { name: 'Enviar la orden' }).click();
    await page.getByRole('button', { name: 'Confirmar y esperar a las 9:00' }).click();
  } else {
    // referencia 0: acertar las cinco noticias
    await expect(page.getByRole('heading', { name: 'Tus primeras acciones' })).toBeVisible();
    const label = { up: /^▲ Sube$/, down: /^▼ Baja$/, flat: /^＝ Apenas se mueve$/ } as const;
    const rounds = setupFirstShares(seed).rounds;
    for (const [i, r] of rounds.entries()) {
      await page.getByRole('button', { name: label[r.news.move] }).click();
      await page
        .getByRole('button', {
          name: i === rounds.length - 1 ? 'Ver el resultado' : 'Siguiente noticia',
        })
        .click();
    }
  }
  await page.getByRole('button', { name: 'Ver qué ha pasado' }).click();
  const values = referenceValues(kind, seed)[0]!;
  const exercises = lesson.exercises.map((e) =>
    isParametric(e as unknown as Exercise)
      ? (instantiate(e as unknown as Exercise, undefined, values).exercise as unknown as Ex)
      : e,
  );
  return playLesson(page, { ...lesson, exercises }, opts);
}
