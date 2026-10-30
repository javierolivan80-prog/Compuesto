import { mulberry32 } from '../prng';

/*
 * «La posición corta» (lección-juego de la planta 4, unidad «Ventas en corto y préstamo de valores»). Ninguna ficha
 * de JUEGOS.md trata los cortos, así que es un juego sencillo de cuatro pasos sobre una venta en corto de una acción
 * ficticia:
 *   1. Comisión de préstamo: acciones × precio de venta × tipo anual × días / 360. Distractores: la comisión de un año
 *      entero y la calculada con el precio final.
 *   2. Resultado al cerrar: acciones × (precio de venta − precio de recompra) − comisión − dividendo manufacturado
 *      (el corto paga al prestamista el dividendo que reparte la empresa). Distractores: sin el dividendo y sin el
 *      dividendo ni la comisión.
 *   3. Margin call: con una garantía inicial del 150 % del valor vendido (la venta más un 50 % de margen) y un margen
 *      de mantenimiento del mm %, la llamada llega cuando (garantía − acciones × precio) / (acciones × precio) < mm,
 *      es decir, a un precio de P0 × 1,5 / (1 + mm). Distractores: P0 × (1 + mm) y P0 × 1,5, donde se pierde toda la
 *      garantía.
 *   4. Reglamento (UE) 236/2012: una posición corta neta desde el 0,1 % del capital se notifica al supervisor, y desde
 *      el 0,5 % además se publica.
 * Precios en céntimos dentro del motor; cifras ficticias.
 */

export type ShortDuty = 'none' | 'notify' | 'publish';

export interface ShortSetup {
  seed: number;
  qty: number;
  /** Precio de venta en corto (céntimos) y variación hasta la recompra (%, negativa si baja). */
  p0C: number;
  movePct: number;
  /** Comisión de préstamo (% anual) y días que dura el corto. */
  ratePct: number;
  days: number;
  /** Dividendo por acción que reparte la empresa mientras dura el corto (céntimos). */
  divC: number;
  /** Margen de mantenimiento (%). */
  mmPct: number;
  /** Paso 4: posición corta neta de un fondo, en milésimas de punto del capital (150 = 0,15 %). */
  shortMilli: number;
}

/** Garantía inicial: el importe de la venta más un 50 % de margen. */
export const INITIAL_MARGIN_PCT = 50;

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupShort(seed: number): ShortSetup {
  if (seed === 0)
    return {
      seed,
      qty: 10_000,
      p0C: 2000,
      movePct: -12.5,
      ratePct: 2,
      days: 90,
      divC: 40,
      mmPct: 30,
      shortMilli: 150,
    };
  const rnd = mulberry32(seed);
  return {
    seed,
    qty: pick(rnd, [5000, 10_000, 15_000, 20_000]),
    p0C: pick(rnd, [1000, 1500, 2000, 2500, 4000]),
    movePct: pick(rnd, [-15, -10, -5, 5, 10, 20]),
    ratePct: pick(rnd, [1, 2, 4, 8]),
    days: pick(rnd, [30, 60, 90, 180]),
    divC: pick(rnd, [20, 40, 60]),
    mmPct: pick(rnd, [25, 30, 35]),
    shortMilli: pick(rnd, [50, 80, 150, 300, 600, 800]),
  };
}

export const p0 = (s: ShortSetup) => s.p0C / 100;
/** Precio de recompra (céntimos enteros). */
export const p1C = (s: ShortSetup) => Math.round(s.p0C * (1 + s.movePct / 100));
export const p1 = (s: ShortSetup) => p1C(s) / 100;
export const div = (s: ShortSetup) => s.divC / 100;

/** Paso 1: comisión de préstamo (€). */
export const borrowFee = (s: ShortSetup) => r2((s.qty * p0(s) * s.ratePct * s.days) / 100 / 360);
export function feeOptions(s: ShortSetup): number[] {
  return [
    borrowFee(s),
    r2((s.qty * p0(s) * s.ratePct) / 100),
    r2((s.qty * p1(s) * s.ratePct * s.days) / 100 / 360),
  ].sort((a, b) => a - b);
}

/** Paso 2: resultado bruto, dividendo pagado y resultado final (€). */
export const gross = (s: ShortSetup) => (s.qty * (s.p0C - p1C(s))) / 100;
export const divPaid = (s: ShortSetup) => (s.qty * s.divC) / 100;
export const pnl = (s: ShortSetup) => r2(gross(s) - borrowFee(s) - divPaid(s));
export function pnlOptions(s: ShortSetup): number[] {
  return [pnl(s), r2(gross(s) - borrowFee(s)), gross(s)].sort((a, b) => a - b);
}

/** Paso 3: precio de la llamada de margen y precio al que se pierde toda la garantía (€, 2 decimales). */
export const callPrice = (s: ShortSetup) =>
  r2((p0(s) * (100 + INITIAL_MARGIN_PCT)) / (100 + s.mmPct));
export const wipePrice = (s: ShortSetup) => r2((p0(s) * (100 + INITIAL_MARGIN_PCT)) / 100);
export function callOptions(s: ShortSetup): number[] {
  return [callPrice(s), r2((p0(s) * (100 + s.mmPct)) / 100), wipePrice(s)].sort((a, b) => a - b);
}

/** Paso 4: posición corta neta en % del capital y obligación. */
export const shortPct = (s: ShortSetup) => s.shortMilli / 1000;
export const duty = (s: ShortSetup): ShortDuty =>
  s.shortMilli >= 500 ? 'publish' : s.shortMilli >= 100 ? 'notify' : 'none';

export interface ShortAnswer {
  fee: number;
  pnl: number;
  call: number;
  duty: ShortDuty;
}

export interface ShortResult {
  feeHit: boolean;
  pnlHit: boolean;
  callHit: boolean;
  dutyHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function shortResult(s: ShortSetup, a: ShortAnswer): ShortResult {
  const feeHit = a.fee === borrowFee(s);
  const pnlHit = a.pnl === pnl(s);
  const callHit = a.call === callPrice(s);
  const dutyHit = a.duty === duty(s);
  return {
    feeHit,
    pnlHit,
    callHit,
    dutyHit,
    score: (+feeHit + +pnlHit + +callHit + +dutyHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function shortValues(s: ShortSetup, a: ShortAnswer): Record<string, number> {
  const r = shortResult(s, a);
  return {
    qty: s.qty,
    p0: p0(s),
    p1: p1(s),
    move_pct: s.movePct,
    rate: s.ratePct,
    days: s.days,
    fee: borrowFee(s),
    gross: gross(s),
    div: div(s),
    div_paid: divPaid(s),
    pnl: pnl(s),
    mm: s.mmPct,
    call_price: callPrice(s),
    wipe_price: wipePrice(s),
    short_pct: shortPct(s),
    duty: s.shortMilli >= 500 ? 2 : s.shortMilli >= 100 ? 1 : 0,
    hits: +r.feeHit + +r.pnlHit + +r.callHit + +r.dutyHit,
  };
}
