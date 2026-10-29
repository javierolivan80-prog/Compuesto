import { mulberry32 } from '../prng';

/*
 * «Contra el VWAP» (lección-juego de la planta 4, unidad «Subastas, fixing y costes reales de operar»). Ninguna ficha
 * de JUEGOS.md encaja (la 3 ya se usó en n5-u1 y la 11 es la variante de n5-u6), así que es un juego sencillo de
 * cuatro pasos sobre la orden de compra de un cliente en una acción ficticia española:
 *   1. VWAP de la sesión: Σ(precio × volumen) / Σ volumen de tres tramos. Distractores: la media simple de los
 *      precios (lo que seguiría un TWAP con tramos iguales) y el último precio.
 *   2. Implementation shortfall frente al precio de llegada: (tu precio medio − precio de llegada) / precio de llegada,
 *      en pb. Distractores: tu desviación frente al VWAP (que puede ser negativa aunque hayas pagado de más) y lo que
 *      subió el VWAP desde la llegada.
 *   3. Costes explícitos: comisión del bróker + impuesto sobre las transacciones financieras (0,2 %, solo en compras de
 *      acciones españolas con capitalización superior a 1.000 M€). Hay partidas de compra en una gran empresa (paga el
 *      impuesto), compra en una pequeña y venta (no lo pagan).
 *   4. Dónde ejecutar: un fondo indexado que se valora al cierre va a la subasta de cierre; una orden grande sin prisa,
 *      con un algoritmo VWAP; una orden urgente, ya, aceptando el impacto.
 * Precios en céntimos (el VWAP, en décimas de céntimo) para evitar errores de coma flotante; cifras ficticias.
 */

export type Venue = 'close' | 'vwap' | 'now';
export type CostCase = 'buy-large' | 'buy-small' | 'sell-large';

export interface VwapSetup {
  seed: number;
  /** Precio de llegada (céntimos): el punto medio cuando el cliente da la orden. */
  arrivalC: number;
  /** Tres tramos de la sesión: precio (céntimos) y volumen (acciones). */
  pricesC: [number, number, number];
  vols: [number, number, number];
  /** Tu precio medio de ejecución (céntimos). */
  fillC: number;
  /** Paso 3: acciones de la orden, comisión en pb del efectivo y caso del impuesto. */
  qty: number;
  commBp: number;
  costCase: CostCase;
  /** Paso 4: tipo de cliente. */
  venue: Venue;
}

/** Tipo del impuesto sobre las transacciones financieras: 0,2 % = 20 pb. */
export const ITF_BP = 20;

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** VWAP en décimas de céntimo (milésimas de euro). */
const vwapM = (p: readonly number[], v: readonly number[]) =>
  Math.round((10 * (p[0]! * v[0]! + p[1]! * v[1]! + p[2]! * v[2]!)) / (v[0]! + v[1]! + v[2]!));
/** Media simple de los tres precios, en décimas de céntimo. */
const meanM = (p: readonly number[]) => Math.round((10 * (p[0]! + p[1]! + p[2]!)) / 3);

const bpOf = (numM: number, denM: number) => r1((numM / denM) * 10_000);

export const vwap = (s: VwapSetup) => vwapM(s.pricesC, s.vols) / 1000;
export const twap = (s: VwapSetup) => meanM(s.pricesC) / 1000;
export const lastPrice = (s: VwapSetup) => s.pricesC[2] / 100;
export const arrival = (s: VwapSetup) => s.arrivalC / 100;
export const fillPrice = (s: VwapSetup) => s.fillC / 100;

/** Paso 1: el VWAP y sus dos distractores (en €, 3 decimales). */
export function vwapOptions(s: VwapSetup): number[] {
  return [vwap(s), twap(s), lastPrice(s)].sort((a, b) => a - b);
}

/** Paso 2 (pb, 1 decimal): shortfall frente a la llegada, desviación frente al VWAP y deriva del VWAP. */
export const shortfallBp = (s: VwapSetup) => bpOf(10 * (s.fillC - s.arrivalC), 10 * s.arrivalC);
export const vsVwapBp = (s: VwapSetup) =>
  bpOf(10 * s.fillC - vwapM(s.pricesC, s.vols), vwapM(s.pricesC, s.vols));
export const driftBp = (s: VwapSetup) =>
  bpOf(vwapM(s.pricesC, s.vols) - 10 * s.arrivalC, 10 * s.arrivalC);
export function shortfallOptions(s: VwapSetup): number[] {
  return [shortfallBp(s), vsVwapBp(s), driftBp(s)].sort((a, b) => a - b);
}

/** Paso 3 (€): efectivo, comisión, impuesto y coste explícito total. */
export const tradeValue = (s: VwapSetup) => (s.qty * s.fillC) / 100;
export const commission = (s: VwapSetup) => r2((tradeValue(s) * s.commBp) / 10_000);
export const itfApplies = (s: VwapSetup) => s.costCase === 'buy-large';
export const itf = (s: VwapSetup) => r2((tradeValue(s) * ITF_BP) / 10_000);
export const explicitCost = (s: VwapSetup) => r2(commission(s) + (itfApplies(s) ? itf(s) : 0));
export function costOptions(s: VwapSetup): number[] {
  return [commission(s), itf(s), r2(commission(s) + itf(s))].sort((a, b) => a - b);
}

export function setupVwap(seed: number): VwapSetup {
  if (seed === 0)
    return {
      seed,
      arrivalC: 1000,
      pricesC: [1004, 1010, 1016],
      vols: [20_000, 50_000, 30_000],
      fillC: 1008,
      qty: 50_000,
      commBp: 5,
      costCase: 'buy-large',
      venue: 'close',
    };
  const rnd = mulberry32(seed);
  const venue = pick(rnd, ['close', 'vwap', 'now'] as const);
  const costCase = pick(rnd, ['buy-large', 'buy-small', 'sell-large'] as const);
  const qty = pick(rnd, [20_000, 50_000, 100_000]);
  const commBp = pick(rnd, [3, 5, 8, 10]);
  // se repite el sorteo de precios hasta que las tres opciones de cada paso se distinguen en pantalla
  for (;;) {
    const arrivalC = pick(rnd, [800, 1000, 1200, 1500, 2000]);
    const d1 = pick(rnd, [2, 4, 6]);
    const d2 = d1 + pick(rnd, [4, 6, 8]);
    const d3 = d2 + pick(rnd, [4, 6, 8]);
    const pricesC: [number, number, number] = [arrivalC + d1, arrivalC + d2, arrivalC + d3];
    const vols = [0, 0, 0].map(() => pick(rnd, [10_000, 20_000, 30_000, 40_000, 50_000])) as [
      number,
      number,
      number,
    ];
    const fillC = arrivalC + d2 - pick(rnd, [1, 2, 3]);
    const s: VwapSetup = { seed, arrivalC, pricesC, vols, fillC, qty, commBp, costCase, venue };
    if (new Set(vwapOptions(s)).size === 3 && new Set(shortfallOptions(s)).size === 3) return s;
  }
}

export interface VwapAnswer {
  vwap: number;
  shortfall: number;
  cost: number;
  venue: Venue;
}

export interface VwapResult {
  vwapHit: boolean;
  shortfallHit: boolean;
  costHit: boolean;
  venueHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function vwapResult(s: VwapSetup, a: VwapAnswer): VwapResult {
  const vwapHit = a.vwap === vwap(s);
  const shortfallHit = a.shortfall === shortfallBp(s);
  const costHit = a.cost === explicitCost(s);
  const venueHit = a.venue === s.venue;
  return {
    vwapHit,
    shortfallHit,
    costHit,
    venueHit,
    score: (+vwapHit + +shortfallHit + +costHit + +venueHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function vwapValues(s: VwapSetup, a: VwapAnswer): Record<string, number> {
  const r = vwapResult(s, a);
  return {
    arrival: arrival(s),
    p1: s.pricesC[0] / 100,
    p2: s.pricesC[1] / 100,
    p3: s.pricesC[2] / 100,
    v1: s.vols[0],
    v2: s.vols[1],
    v3: s.vols[2],
    d1_c: s.pricesC[0] - s.arrivalC,
    d2_c: s.pricesC[1] - s.arrivalC,
    d3_c: s.pricesC[2] - s.arrivalC,
    fill_c: s.fillC - s.arrivalC,
    vwap: vwap(s),
    twap: twap(s),
    fill: fillPrice(s),
    shortfall_bp: shortfallBp(s),
    vs_vwap_bp: vsVwapBp(s),
    drift_bp: driftBp(s),
    qty: s.qty,
    value: tradeValue(s),
    comm_bp: s.commBp,
    commission: commission(s),
    itf: itf(s),
    itf_applies: itfApplies(s) ? 1 : 0,
    explicit: explicitCost(s),
    hits: +r.vwapHit + +r.shortfallHit + +r.costHit + +r.venueHit,
  };
}
