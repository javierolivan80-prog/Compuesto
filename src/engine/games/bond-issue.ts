import { mulberry32 } from '../prng';

/*
 * «La emisión de Naranjas» (lección-juego de la planta 2, unidad «Bonos: cupón, precio y TIR»): Naranjas del Turia
 * emite un bono a 5 años. Tres pasos:
 *   1. Pones el cupón. Los inversores piden la rentabilidad del Bono del Estado a 5 años más el diferencial de
 *      Naranjas: si el cupón queda por debajo, el bono se coloca por debajo de 100 y se capta menos; por encima, se
 *      paga de más durante cinco años. Objetivo: colocarlo a la par.
 *   2. Un año después cambian los tipos: predices si el precio del bono sube o baja y lo ves.
 *   3. Un inversor lo compra a ese precio nuevo: eliges su TIR.
 * Cupones anuales, nominal 100 (precio en % del nominal), sin cupón corrido: la emisión y la compra son en fecha de
 * cupón.
 */

export const YEARS = 5;
/** Bonos de 1.000 € de nominal que emite Naranjas: 20 millones de €. */
export const BONDS = 20000;
export const NOMINAL = 1000;
/** Rejilla del cupón (%). */
export const COUPON_GRID = { min: 2, max: 6, step: 0.1 } as const;
/** Banda «a la par»: precio entre 99,5 y 100,5. */
export const PAR_BAND = 0.5;

export interface BondSetup {
  seed: number;
  /** Rentabilidad del Bono del Estado a 5 años y diferencial de crédito de Naranjas (en %). */
  tesoro: number;
  spread: number;
  /** Cambio de los tipos un año después (puntos porcentuales). */
  shock: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

export function setupBond(seed: number): BondSetup {
  if (seed === 0) return { seed, tesoro: 2.8, spread: 1.4, shock: 1 };
  const rnd = mulberry32(seed);
  return {
    seed,
    tesoro: pick(rnd, [2.5, 2.8, 3.1]),
    spread: pick(rnd, [1.2, 1.4, 1.6]),
    shock: pick(rnd, [1, -1, 0.5, -0.5]),
  };
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Rentabilidad que piden los inversores a Naranjas (%). */
export const required = (s: BondSetup) => r1(s.tesoro + s.spread);

/** Precio (por 100 de nominal) de un bono con cupón anual `c` % y `n` años, descontado a `y` %. */
export function price(c: number, y: number, n: number): number {
  const r = y / 100;
  let p = 0;
  for (let t = 1; t <= n; t++) p += c / (1 + r) ** t;
  return p + 100 / (1 + r) ** n;
}

/** TIR (%) de un bono comprado a `p` con cupón `c` y `n` años: la `y` que iguala el precio (bisección). */
export function ytm(p: number, c: number, n: number): number {
  let lo = -5;
  let hi = 30;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (price(c, mid, n) > p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const atPar = (s: BondSetup, coupon: number) =>
  Math.abs(price(coupon, required(s), YEARS) - 100) <= PAR_BAND;

/** Precio un año después, con el cupón elegido, cuatro años por delante y los tipos movidos. */
export const priceAfter = (s: BondSetup, coupon: number) =>
  price(coupon, required(s) + s.shock, YEARS - 1);

/** Opciones de TIR del paso 3: la buena, el cupón (confundirlos) y la rentabilidad de emisión. */
export function tirOptions(s: BondSetup, coupon: number): number[] {
  const good = r2(ytm(priceAfter(s, coupon), coupon, YEARS - 1));
  const raw = [good, r2(coupon), r2(required(s))];
  // si dos coinciden (p. ej. sin cambio de tipos), se separan con un distractor de signo contrario
  const opts = [...new Set(raw)];
  if (opts.length < 3) opts.push(r2(required(s) - s.shock));
  return opts.sort((a, b) => a - b);
}

export interface BondAnswer {
  coupon: number;
  /** ¿Predijo que el precio sube (true) o baja (false)? */
  up: boolean;
  tir: number;
}

export interface BondResult {
  parHit: boolean;
  directionHit: boolean;
  tirHit: boolean;
  score: number;
}

/** Nota: 40 % colocar a la par, 30 % la dirección del precio y 30 % la TIR. */
export function bondResult(s: BondSetup, a: BondAnswer): BondResult {
  const parHit = atPar(s, a.coupon);
  const directionHit = a.up === s.shock < 0;
  const tirHit = Math.abs(a.tir - r2(ytm(priceAfter(s, a.coupon), a.coupon, YEARS - 1))) < 0.005;
  return {
    parHit,
    directionHit,
    tirHit,
    score: Math.round((0.4 * +parHit + 0.3 * +directionHit + 0.3 * +tirHit) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function bondValues(s: BondSetup, a: BondAnswer): Record<string, number> {
  const y = required(s);
  const p = price(a.coupon, y, YEARS);
  const after = priceAfter(s, a.coupon);
  return {
    tesoro: s.tesoro,
    spread: s.spread,
    yield: y,
    coupon: a.coupon,
    price_issue: r2(p),
    raised: Math.round((p / 100) * NOMINAL * BONDS),
    coupon_cash: r2(a.coupon * 10),
    shock: s.shock,
    new_yield: r1(y + s.shock),
    price_after: r2(after),
    change: r2(after - p),
    tir_buy: r2(ytm(after, a.coupon, YEARS - 1)),
    // con el cupón a la par, para comparar
    par_price_after: r2(price(y, y + s.shock, YEARS - 1)),
  };
}
