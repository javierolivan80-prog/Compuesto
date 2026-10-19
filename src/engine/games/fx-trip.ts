import { mulberry32 } from '../prng';

/*
 * «El viaje del dólar» (lección-juego de la planta 2, unidad «Divisas, materias primas y cripto»): inviertes 10.000 €
 * en un ETF de bolsa estadounidense que cotiza en dólares. Tres pasos:
 *   1. Al comprar: cuántos dólares compras con el EUR/USD de hoy (dólares por cada euro).
 *   2. Un año después: el ETF ha subido en dólares, pero el EUR/USD se ha movido. ¿Ganas más o menos que el ETF?
 *   3. Cobertura: la clase cubierta elimina el efecto de la divisa a cambio de un coste anual. Con el miedo a que el
 *      dólar se deprecie, ¿qué clase eliges?
 * Simplificación: la clase cubierta da la subida del ETF menos el coste de cobertura, sin efecto divisa.
 */

export const AMOUNT = 10000;

export interface FxSetup {
  seed: number;
  /** EUR/USD (dólares por euro) al comprar y un año después, y subida del ETF en dólares (%). */
  rate0: number;
  rate1: number;
  etf: number;
  /** Coste anual de la cobertura (%). */
  hedgeCost: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupFx(seed: number): FxSetup {
  if (seed === 0) return { seed, rate0: 1.1, rate1: 1.2, etf: 10, hedgeCost: 1.5 };
  const rnd = mulberry32(seed);
  const rate0 = pick(rnd, [1.05, 1.1, 1.15]);
  return {
    seed,
    rate0,
    rate1: r2(rate0 + pick(rnd, [-0.1, 0.1, 0.15])),
    etf: pick(rnd, [6, 8, 10, 12]),
    hedgeCost: pick(rnd, [1, 1.5, 2]),
  };
}

export const dollars = (s: FxSetup) => AMOUNT * s.rate0;
/** Valor en euros al cabo de un año, sin cubrir y cubierto. */
export const unhedged = (s: FxSetup) => (dollars(s) * (1 + s.etf / 100)) / s.rate1;
export const hedged = (s: FxSetup) => AMOUNT * (1 + (s.etf - s.hedgeCost) / 100);
/** Rentabilidad en euros (%). */
export const eurReturn = (s: FxSetup) => (unhedged(s) / AMOUNT - 1) * 100;

/** Opciones de dólares: la buena, dividir en vez de multiplicar y no convertir. */
export function dollarOptions(s: FxSetup): number[] {
  return [Math.round(dollars(s)), Math.round(AMOUNT / s.rate0), AMOUNT].sort((a, b) => a - b);
}

export type Compare = 'more' | 'less';
/** ¿Ganas en euros más o menos que el ETF en dólares? Menos si el dólar se ha depreciado (sube el EUR/USD). */
export const rightCompare = (s: FxSetup): Compare => (eurReturn(s) > s.etf ? 'more' : 'less');

export interface FxAnswer {
  dollars: number;
  compare: Compare;
  hedge: boolean;
}

export interface FxResult {
  dollarsHit: boolean;
  compareHit: boolean;
  hedgeHit: boolean;
  score: number;
}

/** Nota: un tercio por paso. Con miedo a que el dólar se deprecie, lo coherente es cubrir. */
export function fxResult(s: FxSetup, a: FxAnswer): FxResult {
  const dollarsHit = a.dollars === Math.round(dollars(s));
  const compareHit = a.compare === rightCompare(s);
  const hedgeHit = a.hedge;
  return {
    dollarsHit,
    compareHit,
    hedgeHit,
    score: Math.round(((+dollarsHit + +compareHit + +hedgeHit) / 3) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function fxValues(s: FxSetup, a: FxAnswer): Record<string, number> {
  return {
    amount: AMOUNT,
    rate0: s.rate0,
    rate1: s.rate1,
    usd: Math.round(dollars(s)),
    etf: s.etf,
    usd_end: Math.round(dollars(s) * (1 + s.etf / 100)),
    eur_end: Math.round(unhedged(s)),
    eur_return: r2(eurReturn(s)),
    hedge_cost: s.hedgeCost,
    hedged_end: Math.round(hedged(s)),
    hedged_return: r2(s.etf - s.hedgeCost),
    hits: +fxResult(s, a).dollarsHit + +fxResult(s, a).compareHit + +fxResult(s, a).hedgeHit,
  };
}
