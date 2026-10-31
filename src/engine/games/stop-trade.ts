import { mulberry32 } from '../prng';
import { IMPULSIVE_STEPS, START_VALUE, impulsiveMarket, type ImpulsiveMarket } from './impulsive';

/*
 * «El trader con stop» (lección-juego de la planta 4, unidad «Stop, tamaño de posición y sesgos»): la variante de
 * lección de «El trader impulsivo» (ficha 11 de JUEGOS.md). Reutiliza su mercado (`impulsiveMarket`: 30 sesiones con
 * noticias tentadoras que persiguen al precio) y su capital inicial, sin duplicarlos, y cambia la pregunta: en vez
 * de operar por impulso, se planifica una operación con stop y objetivo. Cuatro pasos:
 *   1. Tamaño de posición = riesgo en € (capital × riesgo %) / distancia al stop. Distractores: riesgo / precio
 *      (sin el stop) y capital / precio (todo el capital).
 *   2. Relación riesgo/beneficio k: el objetivo está a k veces la distancia al stop. Acierto mínimo para no perder =
 *      1 / (1 + k). Distractores: 1 / k y k / (1 + k).
 *   3. Se recorren las 30 sesiones del mercado: sale en el stop, en el objetivo o al cierre del último día. Resultado
 *      en €. Distractores: los otros dos finales posibles.
 *   4. A mitad de camino, con el precio cerca del stop y una noticia de pánico: mantener el stop (bien), bajarlo
 *      para «darle aire» (aversión a la pérdida) o comprar más para promediar.
 * Precios en céntimos; el índice del mercado (100 al empezar) se escala al precio de la acción ficticia.
 */

export type StopMove = 'keep' | 'lower' | 'average';
export type Outcome = 'stop' | 'target' | 'close';

export interface StopSetup {
  seed: number;
  market: ImpulsiveMarket;
  /** Precio de entrada (céntimos), riesgo por operación (%), distancia al stop (%) y relación riesgo/beneficio. */
  entryC: number;
  riskPct: number;
  stopPct: number;
  rr: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;

export function setupStop(seed: number): StopSetup {
  const market = impulsiveMarket(seed);
  if (seed === 0) return { seed, market, entryC: 2000, riskPct: 1, stopPct: 5, rr: 2 };
  const rnd = mulberry32(seed ^ 0x51f15e);
  for (;;) {
    const s: StopSetup = {
      seed,
      market,
      entryC: pick(rnd, [1000, 2000, 2500, 4000]),
      riskPct: pick(rnd, [1, 2]),
      stopPct: pick(rnd, [2, 4, 5, 8]),
      rr: pick(rnd, [1.5, 2, 3]),
    };
    if (new Set(resultOptions(s)).size === 3 && new Set(sharesOptions(s)).size === 3) return s;
  }
}

/**
 * Riesgo en € de la operación, sobre el capital de El trader impulsivo. START_VALUE se lee al llamar, no al cargar el
 * módulo: así no depende del orden de carga si hay un ciclo de importaciones.
 */
export const riskEur = (s: StopSetup) => (START_VALUE * s.riskPct) / 100;
export const entry = (s: StopSetup) => s.entryC / 100;
/** Distancia al stop en céntimos (entera) y precios del stop y del objetivo. */
const distC = (s: StopSetup) => Math.round((s.entryC * s.stopPct) / 100);
export const stopPrice = (s: StopSetup) => (s.entryC - distC(s)) / 100;
export const targetPrice = (s: StopSetup) => (s.entryC + Math.round(distC(s) * s.rr)) / 100;

/** Paso 1: acciones = riesgo / distancia al stop (redondeado hacia abajo). */
export const shares = (s: StopSetup) => Math.floor((riskEur(s) * 100) / distC(s));
export function sharesOptions(s: StopSetup): number[] {
  return [shares(s), Math.floor(riskEur(s) / entry(s)), Math.floor(START_VALUE / entry(s))].sort(
    (a, b) => a - b,
  );
}

/** Paso 2: acierto mínimo para no perder (%, 1 decimal). */
export const breakeven = (s: StopSetup) => r1(100 / (1 + s.rr));
export function breakevenOptions(s: StopSetup): number[] {
  return [breakeven(s), r1(100 / s.rr), r1((100 * s.rr) / (1 + s.rr))].sort((a, b) => a - b);
}

/** Precio (céntimos) de la acción en cada una de las 31 sesiones. */
export const pathC = (s: StopSetup) => s.market.prices.map((p) => Math.round((s.entryC * p) / 100));

/** Paso 3: cómo y cuándo termina la operación. */
export function exitOf(s: StopSetup): { outcome: Outcome; day: number; priceC: number } {
  const path = pathC(s);
  const stopC = s.entryC - distC(s);
  const targetC = s.entryC + Math.round(distC(s) * s.rr);
  for (let d = 1; d <= IMPULSIVE_STEPS; d++) {
    if (path[d]! <= stopC) return { outcome: 'stop', day: d, priceC: stopC };
    if (path[d]! >= targetC) return { outcome: 'target', day: d, priceC: targetC };
  }
  return { outcome: 'close', day: IMPULSIVE_STEPS, priceC: path[IMPULSIVE_STEPS]! };
}
export const result = (s: StopSetup) => r2((shares(s) * (exitOf(s).priceC - s.entryC)) / 100);
export function resultOptions(s: StopSetup): number[] {
  const n = shares(s);
  const path = pathC(s);
  return [
    r2((-n * distC(s)) / 100),
    r2((n * Math.round(distC(s) * s.rr)) / 100),
    r2((n * (path[IMPULSIVE_STEPS]! - s.entryC)) / 100),
  ].sort((a, b) => a - b);
}

/** Paso 4: la sesión de la tentación, la del precio más bajo antes de salir (o la 15 si nunca bajó). */
export function temptDay(s: StopSetup): number {
  const path = pathC(s);
  const last = exitOf(s).day;
  let day = Math.min(15, last);
  for (let d = 1; d < last; d++) if (path[d]! < path[day]!) day = d;
  return day;
}

export interface StopAnswer {
  shares: number;
  breakeven: number;
  result: number;
  move: StopMove;
}

export interface StopResult {
  sharesHit: boolean;
  breakevenHit: boolean;
  resultHit: boolean;
  moveHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function stopResult(s: StopSetup, a: StopAnswer): StopResult {
  const sharesHit = a.shares === shares(s);
  const breakevenHit = a.breakeven === breakeven(s);
  const resultHit = a.result === result(s);
  const moveHit = a.move === 'keep';
  return {
    sharesHit,
    breakevenHit,
    resultHit,
    moveHit,
    score: (+sharesHit + +breakevenHit + +resultHit + +moveHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function stopValues(s: StopSetup, a: StopAnswer): Record<string, number> {
  const r = stopResult(s, a);
  const exit = exitOf(s);
  return {
    capital: START_VALUE,
    risk_pct: s.riskPct,
    risk_eur: riskEur(s),
    entry: entry(s),
    stop_pct: s.stopPct,
    stop: stopPrice(s),
    rr: s.rr,
    target: targetPrice(s),
    shares: shares(s),
    position: r2(shares(s) * entry(s)),
    breakeven: breakeven(s),
    outcome: exit.outcome === 'stop' ? 0 : exit.outcome === 'target' ? 1 : 2,
    exit_day: exit.day,
    exit_price: exit.priceC / 100,
    result: result(s),
    hits: +r.sharesHit + +r.breakevenHit + +r.resultHit + +r.moveHit,
  };
}
