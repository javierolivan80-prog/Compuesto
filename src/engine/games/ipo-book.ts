import { mulberry32 } from '../prng';

/*
 * «La salida a bolsa» (lección-juego de la planta 0, unidad «Mercado primario y secundario»): revives la salida a
 * bolsa de Naranjas del Turia. La familia tenía 9.000.000 de acciones; se ofrecen 3.000.000 nuevas (OPS, el dinero va a
 * la empresa) y 1.200.000 de la familia (OPV, el dinero va a la familia). Así quedan 12.000.000 de acciones con un
 * 35 % de free float, las cifras del universo. Ves la demanda del libro de órdenes a cada precio del rango indicativo,
 * eliges el precio de salida y miras el primer día de cotización. Enseña OPS frente a OPV, sobresuscripción, el precio
 * dentro del rango y que, una vez en bolsa, el dinero ya va de inversor a inversor. Lógica pura y determinista.
 */

export const FAMILY_BEFORE = 9_000_000;
export const NEW_SHARES = 3_000_000;
export const SOLD_SHARES = 1_200_000;
export const OFFER = NEW_SHARES + SOLD_SHARES;
export const SHARES_AFTER = FAMILY_BEFORE + NEW_SHARES;
export const RANGE_MIN = 9;
export const RANGE_MAX = 10.5;
export const PRICE_STEP = 0.25;
/** Subida del primer día a partir de la cual se considera que se «dejó dinero en la mesa». */
export const MAX_POP = 15;

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Precios que se pueden elegir: el rango indicativo de 0,25 en 0,25 €. */
export const PRICES: readonly number[] = Array.from(
  { length: Math.round((RANGE_MAX - RANGE_MIN) / PRICE_STEP) + 1 },
  (_, i) => r2(RANGE_MIN + i * PRICE_STEP),
);

export interface IpoSetup {
  seed: number;
  /** Acciones pedidas a 9,00 € (lo más bajo del rango). */
  demandLow: number;
  /** Acciones pedidas a 10,50 € (lo más alto). */
  demandHigh: number;
  /** Lo que el mercado cree que vale la acción el primer día (€). */
  value: number;
}

export function setupIpo(seed: number): IpoSetup {
  const rnd = mulberry32(seed);
  const demandLow = 16_000_000 + Math.floor(rnd() * 9) * 500_000;
  const demandHigh = 3_000_000 + Math.floor(rnd() * 7) * 250_000;
  const value = r2(9.8 + Math.floor(rnd() * 7) * 0.1);
  return { seed, demandLow, demandHigh, value };
}

/** Acciones pedidas a un precio: la demanda baja en línea recta de 9,00 a 10,50 €, en múltiplos de 50.000. */
export function demandAt(s: IpoSetup, price: number): number {
  const t = (price - RANGE_MIN) / (RANGE_MAX - RANGE_MIN);
  const d = s.demandLow + (s.demandHigh - s.demandLow) * t;
  return Math.round(d / 50_000) * 50_000;
}

/** Veces que la demanda cubre la oferta (sobresuscripción si es mayor que 1). */
export const coverage = (s: IpoSetup, price: number): number => demandAt(s, price) / OFFER;

/**
 * Cierre del primer día: el valor que el mercado ve en la acción, más un empujón si sobró mucha demanda (quien no
 * recibió acciones las compra en bolsa) o menos si sobró poca. Hasta 6 veces cubierta.
 */
export function firstDayClose(s: IpoSetup, price: number): number {
  const cov = Math.min(coverage(s, price), 6);
  return r2(s.value * (1 + 0.015 * (cov - 2)));
}

export type IpoOutcome = 'failed' | 'broke' | 'table' | 'good';

/**
 * `failed`: la demanda no cubre la oferta; `broke`: el primer día cierra por debajo del precio de salida; `table`:
 * sube más de un 15 % (la empresa y la familia dejaron dinero en la mesa); `good`: ni lo uno ni lo otro.
 */
export function outcomeAt(s: IpoSetup, price: number): IpoOutcome {
  if (coverage(s, price) < 1) return 'failed';
  const close = firstDayClose(s, price);
  if (close < price - 1e-9) return 'broke';
  if ((close / price - 1) * 100 > MAX_POP + 1e-9) return 'table';
  return 'good';
}

const SCORE: Record<IpoOutcome, number> = { failed: 0, broke: 0.25, table: 0.5, good: 1 };

/** El precio más alto que sale bien: el que más dinero da a Naranjas y a la familia sin romper el estreno. */
export function bestPrice(s: IpoSetup): number | null {
  const good = PRICES.filter((p) => outcomeAt(s, p) === 'good');
  return good.length ? good.at(-1)! : null;
}

export interface IpoResult {
  price: number;
  newShares: number;
  soldShares: number;
  offer: number;
  /** Lo que recibe Naranjas (OPS). */
  opsCash: number;
  /** Lo que recibe la familia (OPV). */
  opvCash: number;
  demand: number;
  /** Veces cubierta, con 2 decimales. */
  cov: number;
  /** Cierre del primer día (€); 0 si la oferta no se cubre. */
  first: number;
  /** Variación del primer día frente al precio de salida, en %. */
  pop: number;
  sharesAfter: number;
  /** Porcentaje que conserva la familia tras la salida. */
  family: number;
  outcome: IpoOutcome;
  score: number;
}

export function ipoResult(s: IpoSetup, price: number): IpoResult {
  const outcome = outcomeAt(s, price);
  const first = outcome === 'failed' ? 0 : firstDayClose(s, price);
  return {
    price,
    newShares: NEW_SHARES,
    soldShares: SOLD_SHARES,
    offer: OFFER,
    opsCash: r2(price * NEW_SHARES),
    opvCash: r2(price * SOLD_SHARES),
    demand: demandAt(s, price),
    cov: r2(coverage(s, price)),
    first,
    pop: first ? r2((first / price - 1) * 100) : 0,
    sharesAfter: SHARES_AFTER,
    family: r2(((FAMILY_BEFORE - SOLD_SHARES) / SHARES_AFTER) * 100),
    outcome,
    // un precio bueno que no es el más alto posible: bien, pero se podía pedir algo más
    score: outcome === 'good' && price !== bestPrice(s) ? 0.75 : SCORE[outcome],
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}, en snake_case). */
export function ipoValues(r: IpoResult): Record<string, number> {
  return {
    price: r.price,
    new_shares: r.newShares,
    sold_shares: r.soldShares,
    offer: r.offer,
    ops_cash: r.opsCash,
    opv_cash: r.opvCash,
    demand: r.demand,
    cov: r.cov,
    first: r.first,
    pop: r.pop,
    shares_after: r.sharesAfter,
    family: r.family,
  };
}
