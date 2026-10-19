import { mulberry32 } from '../prng';

/*
 * «La mezcla de la financiación» (lección-juego de la planta 1, unidad «Coste de capital»): la directora financiera
 * de Naranjas pregunta cuánta deuda debería tener. Primero calculas su beta apalancada con su estructura actual
 * (Hamada); luego mueves el peso de la deuda y ves en vivo el coste del capital propio (CAPM), el coste de la deuda
 * después de impuestos y el WACC, hasta proponer la estructura que lo minimiza. La deuda es más barata y ahorra
 * impuestos, pero cada punto de deuda sube la beta y, pasado un umbral, los bancos cobran mucho más.
 * Semilla 0: las hipótesis del modelo DCF de referencia de Naranjas (content/shared/models).
 */

export const TAX = 0.25;
/** Pesos de la deuda que se pueden elegir: de 0 a 70 % de 5 en 5. */
export const WEIGHTS: readonly number[] = Array.from({ length: 15 }, (_, i) => i * 5);
/** Estructura objetivo (la del sector) del modelo DCF de Naranjas: un 20 % de deuda (D/E = 0,25). */
export const CURRENT = 20;

export interface WaccSetup {
  seed: number;
  /** Tipo sin riesgo, prima de mercado y prima por tamaño (en %). */
  rf: number;
  erp: number;
  size: number;
  /** Beta desapalancada del negocio. */
  betaU: number;
  /** Coste de la deuda antes de impuestos con poca deuda (en %). */
  kd0: number;
  /** Peso de la deuda a partir del cual los bancos encarecen el crédito (en %). */
  threshold: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

export function setupWacc(seed: number): WaccSetup {
  if (seed === 0)
    return { seed, rf: 3.25, erp: 5.5, size: 2, betaU: 0.65, kd0: 4.5, threshold: 30 };
  const rnd = mulberry32(seed);
  return {
    seed,
    rf: pick(rnd, [3, 3.25, 3.5]),
    erp: pick(rnd, [5, 5.5, 6]),
    size: 2,
    betaU: pick(rnd, [0.55, 0.65, 0.75]),
    kd0: pick(rnd, [4, 4.5, 5]),
    threshold: pick(rnd, [25, 30, 35]),
  };
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Beta apalancada (Hamada, con beta de la deuda nula): βu × (1 + (1 − t) × D/E). */
export const leveredBeta = (s: WaccSetup, w: number) =>
  r4(s.betaU * (1 + ((1 - TAX) * w) / (100 - w)));

/** Coste del capital propio por CAPM más la prima por tamaño (en %). */
export const costOfEquity = (s: WaccSetup, w: number) =>
  r4(s.rf + leveredBeta(s, w) * s.erp + s.size);

/** Coste de la deuda antes de impuestos: sube con el cuadrado de lo que se pasa del umbral (en %). */
export const costOfDebt = (s: WaccSetup, w: number) =>
  r4(s.kd0 + Math.max(0, (w - s.threshold) / 5) ** 2 * 0.15);

/** WACC = E/V × ke + D/V × kd × (1 − t), en %. */
export function waccAt(s: WaccSetup, w: number): number {
  const d = w / 100;
  return r4((1 - d) * costOfEquity(s, w) + d * costOfDebt(s, w) * (1 - TAX));
}

export function bestWeight(s: WaccSetup): number {
  return WEIGHTS.reduce((a, b) => (waccAt(s, b) < waccAt(s, a) ? b : a));
}

export interface WaccResult {
  betaHit: boolean;
  pick: number;
  best: number;
  /** Puntos de WACC que te quedas por encima del mínimo. */
  gap: number;
  score: number;
}

/** Nota: un 30 % por la beta apalancada y un 70 % por la estructura (pierde 1 punto por cada 0,1 de WACC de más). */
export function waccResult(s: WaccSetup, betaHit: boolean, pickW: number): WaccResult {
  const best = bestWeight(s);
  const gap = r4(waccAt(s, pickW) - waccAt(s, best));
  const structure = Math.max(0, 1 - gap / 0.1 / 10) ** 2;
  return {
    betaHit,
    pick: pickW,
    best,
    gap,
    score: Math.round((0.3 * (betaHit ? 1 : 0) + 0.7 * structure) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function waccValues(s: WaccSetup, r: WaccResult): Record<string, number> {
  const w = CURRENT;
  return {
    rf: s.rf,
    erp: s.erp,
    size: s.size,
    beta_u: s.betaU,
    tax: TAX * 100,
    weight: w,
    de: r4(w / (100 - w)),
    beta_l: leveredBeta(s, w),
    ke: costOfEquity(s, w),
    kd: costOfDebt(s, w),
    kd_after: r4(costOfDebt(s, w) * (1 - TAX)),
    wacc: waccAt(s, w),
    pick: r.pick,
    wacc_pick: waccAt(s, r.pick),
    best: r.best,
    wacc_best: waccAt(s, r.best),
    ke_best: costOfEquity(s, r.best),
    kd_best: costOfDebt(s, r.best),
  };
}
