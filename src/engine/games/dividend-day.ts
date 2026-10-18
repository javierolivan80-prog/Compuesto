import { mulberry32 } from '../prng';

/*
 * «El primer dividendo» (lección-juego de la planta 0, unidad «Operar en España: bróker, dividendos y fiscalidad»):
 * compras acciones de Pirineo Energía eligiendo bróker, la junta aprueba un dividendo, decides si compras más justo
 * antes para «cobrarlo también», predices el precio de referencia en la fecha ex-dividendo, cobras el dividendo con la
 * retención del 19 % y, un mes después, vendes. Enseña comisiones (porcentaje con mínimo frente a tarifa fija), la
 * fecha ex-dividendo, la retención como pago a cuenta y la rentabilidad total. Lógica pura y determinista por semilla.
 */

export interface Broker {
  id: 'llave' | 'fijo' | 'banco';
  /** Porcentaje sobre el importe (0 si es tarifa fija). */
  pct: number;
  /** Mínimo por orden, o la tarifa fija (€). */
  min: number;
}

/** Brókers ficticios: 0,10 % con mínimo de 1 €; 5 € fijos; 0,25 % con mínimo de 8 €. */
export const BROKERS: readonly Broker[] = [
  { id: 'llave', pct: 0.1, min: 1 },
  { id: 'fijo', pct: 0, min: 5 },
  { id: 'banco', pct: 0.25, min: 8 },
];

/** Retención a cuenta del IRPF sobre dividendos (LIRPF art. 101; verificar cada año). */
export const RETENTION = 19;
/** Acciones de más que compras si intentas «cazar» el dividendo. */
export const CAPTURE_QTY = 300;

const r2 = (x: number) => Math.round(x * 100) / 100;

export const commission = (b: Broker, amount: number): number =>
  r2(Math.max((amount * b.pct) / 100, b.min));

export type ExGuess = 'down' | 'same' | 'up';

export interface DividendSetup {
  seed: number;
  /** Acciones que compras. */
  n: number;
  /** Precio de compra (€). */
  p0: number;
  /** Dividendo por acción (€). */
  div: number;
  /** Cierre del día anterior a la fecha ex-dividendo. */
  pBefore: number;
  /** Precio de referencia en la fecha ex-dividendo: el cierre anterior menos el dividendo. */
  pEx: number;
  /** Precio al que vendes un mes después. */
  pEnd: number;
}

export function setupDividend(seed: number): DividendSetup {
  const rnd = mulberry32(seed);
  const n = [200, 300, 400, 600, 800][Math.floor(rnd() * 5)]!;
  const p0 = r2(12 + Math.floor(rnd() * 50) / 100);
  const div = r2(0.3 + Math.floor(rnd() * 5) * 0.05);
  const pBefore = r2(p0 * (1 + (Math.floor(rnd() * 21) - 10) / 1000));
  const pEx = r2(pBefore - div);
  const pEnd = r2(pEx * (1 + 0.02 + Math.floor(rnd() * 4) * 0.01));
  return { seed, n, p0, div, pBefore, pEx, pEnd };
}

/** El bróker más barato para la orden de compra (el primero si empatan). */
export function cheapestBroker(s: DividendSetup): number {
  const fees = BROKERS.map((b) => commission(b, s.n * s.p0));
  return fees.indexOf(Math.min(...fees));
}

export interface DividendChoices {
  broker: number;
  capture: boolean;
  exGuess: ExGuess;
}

export interface DividendResult {
  n: number;
  p0: number;
  feeBuy: number;
  cost: number;
  div: number;
  gross: number;
  /** Lo que retiene Hacienda (19 %). */
  retained: number;
  net: number;
  pBefore: number;
  pEx: number;
  pEnd: number;
  feeSell: number;
  /** Lo que recibes al vender, ya descontada la comisión. */
  sale: number;
  /** Ganancia por precio: venta neta − coste de compra. */
  gain: number;
  /** Rentabilidad total antes de impuestos, en %: (ganancia + dividendo bruto) ÷ coste. */
  total: number;
  /** Rentabilidad por dividendo sobre el precio de compra, en %. */
  dy: number;
  /** Comisiones de comprar 300 más antes de la fecha ex y venderlas después (lo que cuesta «cazar» el dividendo). */
  capLoss: number;
  score: number;
}

export function dividendResult(s: DividendSetup, c: DividendChoices): DividendResult {
  const b = BROKERS[c.broker] ?? BROKERS[0]!;
  const feeBuy = commission(b, s.n * s.p0);
  const cost = r2(s.n * s.p0 + feeBuy);
  const gross = r2(s.n * s.div);
  const retained = r2((gross * RETENTION) / 100);
  const feeSell = commission(b, s.n * s.pEnd);
  const sale = r2(s.n * s.pEnd - feeSell);
  const gain = r2(sale - cost);
  // cazar el dividendo: compras a pBefore y vendes a pEx; el dividendo bruto compensa justo la bajada, y quedan las comisiones
  const capLoss = r2(commission(b, CAPTURE_QTY * s.pBefore) + commission(b, CAPTURE_QTY * s.pEx));
  const points =
    Number(c.broker === cheapestBroker(s)) + Number(!c.capture) + Number(c.exGuess === 'down');
  return {
    n: s.n,
    p0: s.p0,
    feeBuy,
    cost,
    div: s.div,
    gross,
    retained,
    net: r2(gross - retained),
    pBefore: s.pBefore,
    pEx: s.pEx,
    pEnd: s.pEnd,
    feeSell,
    sale,
    gain,
    total: r2(((gain + gross) / cost) * 100),
    dy: r2((s.div / s.p0) * 100),
    capLoss,
    score: Math.round((points / 3) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}, en snake_case). */
export function dividendValues(r: DividendResult): Record<string, number> {
  return {
    n: r.n,
    p0: r.p0,
    fee_buy: r.feeBuy,
    cost: r.cost,
    div: r.div,
    gross: r.gross,
    retained: r.retained,
    net: r.net,
    p_before: r.pBefore,
    p_ex: r.pEx,
    p_end: r.pEnd,
    fee_sell: r.feeSell,
    sale: r.sale,
    gain: r.gain,
    total: r.total,
    dy: r.dy,
    cap_loss: r.capLoss,
  };
}
