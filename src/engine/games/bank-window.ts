import { mulberry32 } from '../prng';

/*
 * «El escaparate del banco» (lección-juego de la planta 2, unidad «Pensiones, SOCIMI, derivados y productos
 * complejos»): en la oficina de un banco ficticio te ofrecen cuatro cosas. Cuatro pasos:
 *   1. ¿Complejo o no complejo? Clasificas cuatro productos según la normativa de inversión.
 *   2. Plan de pensiones: la aportación reduce la base del IRPF; calculas el ahorro con tu tipo marginal.
 *   3. SOCIMI: debe repartir como dividendo al menos una parte de su beneficio por alquileres.
 *   4. Futuro: compras un futuro a un precio; al vencer, ganas o pierdes la diferencia por cada unidad.
 * Cifras fiscales ilustrativas, con fuente y fecha en las lecciones.
 */

export const PRODUCTS = [
  { id: 'deposit', complex: false },
  { id: 'ucits', complex: false },
  { id: 'autocall', complex: true },
  { id: 'cfd', complex: true },
] as const;
export type ProductId = (typeof PRODUCTS)[number]['id'];

/** Parte mínima del beneficio por alquileres que una SOCIMI debe repartir (Ley 11/2009, art. 6). */
export const SOCIMI_RENT_PAYOUT = 0.8;

export interface WindowSetup {
  seed: number;
  /** Aportación al plan (€) y tipo marginal del IRPF (%). */
  contribution: number;
  marginal: number;
  /** Beneficio por alquileres de la SOCIMI (miles de €). */
  rentProfit: number;
  /** Precio del futuro al comprar y al vencer, y unidades. */
  f0: number;
  f1: number;
  units: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

export function setupWindow(seed: number): WindowSetup {
  if (seed === 0)
    return {
      seed,
      contribution: 1500,
      marginal: 30,
      rentProfit: 1000,
      f0: 100,
      f1: 108,
      units: 10,
    };
  const rnd = mulberry32(seed);
  return {
    seed,
    contribution: pick(rnd, [500, 1000, 1500]),
    marginal: pick(rnd, [24, 30, 37]),
    rentProfit: pick(rnd, [500, 1000, 2000]),
    f0: 100,
    f1: pick(rnd, [92, 95, 105, 108]),
    units: pick(rnd, [5, 10, 20]),
  };
}

export const taxSaving = (s: WindowSetup) => Math.round((s.contribution * s.marginal) / 100);
export const minDividend = (s: WindowSetup) => Math.round(s.rentProfit * SOCIMI_RENT_PAYOUT);
export const futurePnl = (s: WindowSetup) => (s.f1 - s.f0) * s.units;

export function savingOptions(s: WindowSetup): number[] {
  return [taxSaving(s), s.contribution, Math.round((s.contribution * 19) / 100)]
    .filter((v, i, xs) => xs.indexOf(v) === i)
    .sort((a, b) => a - b);
}
export function dividendOptions(s: WindowSetup): number[] {
  return [minDividend(s), Math.round(s.rentProfit / 2), s.rentProfit].sort((a, b) => a - b);
}
export function pnlOptions(s: WindowSetup): number[] {
  const p = futurePnl(s);
  return [p, -p, s.f1 - s.f0].filter((v, i, xs) => xs.indexOf(v) === i).sort((a, b) => a - b);
}

export interface WindowAnswer {
  /** Clasificación de cada producto (true = complejo), en el orden de PRODUCTS. */
  complex: boolean[];
  saving: number;
  dividend: number;
  pnl: number;
}

export interface WindowResult {
  complexHits: number;
  savingHit: boolean;
  dividendHit: boolean;
  pnlHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso; el primero, repartido entre los cuatro productos. */
export function windowResult(s: WindowSetup, a: WindowAnswer): WindowResult {
  const complexHits = PRODUCTS.filter((p, i) => a.complex[i] === p.complex).length;
  const savingHit = a.saving === taxSaving(s);
  const dividendHit = a.dividend === minDividend(s);
  const pnlHit = a.pnl === futurePnl(s);
  return {
    complexHits,
    savingHit,
    dividendHit,
    pnlHit,
    score:
      Math.round(
        ((complexHits / PRODUCTS.length + +savingHit + +dividendHit + +pnlHit) / 4) * 1000,
      ) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function windowValues(s: WindowSetup, a: WindowAnswer): Record<string, number> {
  const r = windowResult(s, a);
  return {
    contribution: s.contribution,
    marginal: s.marginal,
    saving: taxSaving(s),
    rent_profit: s.rentProfit,
    min_dividend: minDividend(s),
    f0: s.f0,
    f1: s.f1,
    units: s.units,
    pnl: futurePnl(s),
    complex_hits: r.complexHits,
  };
}
