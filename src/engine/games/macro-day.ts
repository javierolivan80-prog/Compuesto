import { mulberry32 } from '../prng';

/*
 * «El día del dato» (lección-juego de la planta 3, unidad «Los datos que mueven el mercado»): una mañana de
 * calendario macro en la mesa de Albufera Partners. Cuatro pasos:
 *   1. IPC: con el índice de hoy y el de hace un año, ¿cuál es la inflación interanual?
 *   2. Sorpresa: el dato sale por encima o por debajo del consenso; ¿qué hace la rentabilidad del bono a 2 años?
 *      El mercado se mueve por la diferencia con lo esperado, no por el nivel del dato.
 *   3. PMI: por encima de 50, expansión; por debajo, contracción.
 *   4. Paro: tasa de paro = parados / población activa (no / ocupados).
 * Cifras ficticias de una economía inventada.
 */

export interface MacroSetup {
  seed: number;
  /** Índice de precios de hace un año y de hoy. */
  cpiPrev: number;
  cpiNow: number;
  /** Consenso de los analistas para la inflación interanual (%). */
  consensus: number;
  /** PMI manufacturero del mes. */
  pmi: number;
  /** Población activa y parados (millones de personas). */
  active: number;
  unemployed: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;

export function setupMacro(seed: number): MacroSetup {
  if (seed === 0)
    return {
      seed,
      cpiPrev: 112,
      cpiNow: 115.6,
      consensus: 2.9,
      pmi: 48.5,
      active: 24,
      unemployed: 2.76,
    };
  const rnd = mulberry32(seed);
  const cpiPrev = pick(rnd, [104, 108, 112, 118]);
  const yoy = pick(rnd, [1.5, 2.5, 3.5, 4.5]);
  const cpiNow = r1(cpiPrev * (1 + yoy / 100));
  const dato = r1((cpiNow / cpiPrev - 1) * 100);
  return {
    seed,
    cpiPrev,
    cpiNow,
    consensus: r1(dato + pick(rnd, [-0.3, -0.2, 0.2, 0.3])),
    pmi: pick(rnd, [46.5, 48.5, 51.2, 53]),
    active: pick(rnd, [20, 24, 25]),
    unemployed: pick(rnd, [1.8, 2.76, 3.1]),
  };
}

/** Inflación interanual (%), con un decimal, como la publica el INE. */
export const yoy = (s: MacroSetup) => r1((s.cpiNow / s.cpiPrev - 1) * 100);
/** Sorpresa: dato menos consenso (puntos). */
export const surprise = (s: MacroSetup) => r1(yoy(s) - s.consensus);
export const unemploymentRate = (s: MacroSetup) => r1((s.unemployed / s.active) * 100);

/** Opciones de la inflación: la buena, la diferencia de puntos del índice y la división por el índice de hoy. */
export function yoyOptions(s: MacroSetup): number[] {
  const points = r1(s.cpiNow - s.cpiPrev);
  const wrongBase = r1((1 - s.cpiPrev / s.cpiNow) * 100);
  const opts = [...new Set([yoy(s), points, wrongBase])];
  if (opts.length < 3) opts.push(r1(yoy(s) * 2));
  return opts.slice(0, 3).sort((a, b) => a - b);
}

/** Opciones de la tasa de paro: la buena, sobre los ocupados y la tasa de empleo de los activos. */
export function rateOptions(s: MacroSetup): number[] {
  const overEmployed = r1((s.unemployed / (s.active - s.unemployed)) * 100);
  const employed = r1(100 - unemploymentRate(s));
  return [...new Set([unemploymentRate(s), overEmployed, employed])].sort((a, b) => a - b);
}

export type BondMove = 'up' | 'down' | 'flat';
/** Más inflación de la esperada → el mercado espera tipos más altos → sube la rentabilidad a 2 años. */
export const rightBondMove = (s: MacroSetup): BondMove => (surprise(s) > 0 ? 'up' : 'down');
export type Cycle = 'expansion' | 'contraction';
export const rightCycle = (s: MacroSetup): Cycle => (s.pmi > 50 ? 'expansion' : 'contraction');

export interface MacroAnswer {
  yoy: number;
  bond: BondMove;
  cycle: Cycle;
  rate: number;
}

export interface MacroResult {
  yoyHit: boolean;
  bondHit: boolean;
  cycleHit: boolean;
  rateHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function macroResult(s: MacroSetup, a: MacroAnswer): MacroResult {
  const yoyHit = a.yoy === yoy(s);
  const bondHit = a.bond === rightBondMove(s);
  const cycleHit = a.cycle === rightCycle(s);
  const rateHit = a.rate === unemploymentRate(s);
  return {
    yoyHit,
    bondHit,
    cycleHit,
    rateHit,
    score: (+yoyHit + +bondHit + +cycleHit + +rateHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function macroValues(s: MacroSetup, a: MacroAnswer): Record<string, number> {
  const r = macroResult(s, a);
  return {
    cpi_prev: s.cpiPrev,
    cpi_now: s.cpiNow,
    cpi_yoy: yoy(s),
    consensus: s.consensus,
    surprise: surprise(s),
    pmi: s.pmi,
    active: s.active,
    unemployed: s.unemployed,
    unemployment_rate: unemploymentRate(s),
    hits: +r.yoyHit + +r.bondHit + +r.cycleHit + +r.rateHit,
  };
}
