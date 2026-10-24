import { mulberry32 } from '../prng';

/*
 * «La mesa de divisas» (lección-juego de la planta 3, unidad «Finanzas internacionales»): un día en la mesa de
 * divisas de Albufera Partners. Cuatro pasos:
 *   1. Balanza de pagos: saldo de la cuenta corriente = exportaciones − importaciones (bienes y servicios) + rentas
 *      netas (primarias y secundarias) de un país ficticio.
 *   2. Paridad de tipos de interés cubierta: forward a un año del EUR/USD (dólares por euro)
 *      F = S × (1 + i$) / (1 + i€).
 *   3. Carry trade: te financias en una divisa de tipos bajos e inviertes en una de tipos altos; rentabilidad
 *      aproximada = tipo alto − tipo bajo − depreciación de la divisa de tipos altos.
 *   4. Emergentes: con el dólar al alza, ¿qué país ficticio es más vulnerable a una parada súbita? El que tiene a la
 *      vez más déficit por cuenta corriente y más deuda en dólares.
 * Cifras ficticias.
 */

export type Country = 'a' | 'b' | 'same';

export interface FxDeskSetup {
  seed: number;
  /** Balanza (miles de millones de €): exportaciones e importaciones de bienes y servicios, y rentas netas. */
  exports: number;
  imports: number;
  income: number;
  /** EUR/USD de contado (dólares por euro) y tipos a un año del euro y del dólar (%). */
  spot: number;
  iEur: number;
  iUsd: number;
  /** Carry trade: tipo de la divisa de inversión, tipo de la de financiación y depreciación de la primera (%). */
  iHigh: number;
  iFund: number;
  depreciation: number;
  /** Emergentes: el país vulnerable y los datos de cada uno (cuenta corriente y deuda en dólares, % del PIB). */
  vulnerable: 'a' | 'b';
  ccA: number;
  debtA: number;
  ccB: number;
  debtB: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r4 = (x: number) => Math.round(x * 10_000) / 10_000;

export function setupFxDesk(seed: number): FxDeskSetup {
  if (seed === 0)
    return {
      seed,
      exports: 320,
      imports: 300,
      income: -8,
      spot: 1.1,
      iEur: 2,
      iUsd: 4,
      iHigh: 10,
      iFund: 2,
      depreciation: 10.5,
      vulnerable: 'b',
      ccA: 1.5,
      debtA: 12,
      ccB: -5.5,
      debtB: 45,
    };
  const rnd = mulberry32(seed);
  const exports = pick(rnd, [280, 310, 340]);
  // saldo comercial nunca nulo y rentas que no lo anulan ni lo duplican con el signo cambiado
  const trade = pick(rnd, [-20, -12, 12, 20]);
  const income = pick(rnd, [-9, -6, -3, 4, 7]);
  const vulnerable = pick(rnd, ['a', 'b'] as const);
  const weak = { cc: -pick(rnd, [4.5, 5.5, 6.5]), debt: pick(rnd, [35, 45, 55]) };
  const strong = { cc: pick(rnd, [-1, 0.5, 1.5]), debt: pick(rnd, [8, 12, 18]) };
  const [a, b] = vulnerable === 'a' ? [weak, strong] : [strong, weak];
  return {
    seed,
    exports,
    imports: exports - trade,
    income,
    spot: pick(rnd, [1.05, 1.08, 1.1, 1.12]),
    // el dólar rinde siempre más que el euro: los tipos nunca coinciden y el forward nunca es el contado
    iEur: pick(rnd, [1.5, 2, 2.5]),
    iUsd: pick(rnd, [3, 3.5, 4, 4.5]),
    iHigh: pick(rnd, [8, 10, 12]),
    iFund: pick(rnd, [1, 2, 3]),
    // con medio punto, la rentabilidad del carry nunca es exactamente cero
    depreciation: pick(rnd, [4.5, 7.5, 10.5, 13.5]),
    vulnerable,
    ccA: a.cc,
    debtA: a.debt,
    ccB: b.cc,
    debtB: b.debt,
  };
}

/** Saldo comercial y de la cuenta corriente (miles de millones de €). */
export const tradeBalance = (s: FxDeskSetup) => s.exports - s.imports;
export const currentAccount = (s: FxDeskSetup) => tradeBalance(s) + s.income;

/** Opciones: la buena, sin las rentas y con el signo cambiado. */
export function accountOptions(s: FxDeskSetup): number[] {
  return [currentAccount(s), tradeBalance(s), -currentAccount(s)].sort((x, y) => x - y);
}

/** Forward a un año por la paridad cubierta (dólares por euro, 4 decimales). */
export const forward = (s: FxDeskSetup) => r4((s.spot * (1 + s.iUsd / 100)) / (1 + s.iEur / 100));

/** Opciones: la buena, con los tipos al revés y el contado sin cambios. */
export function forwardOptions(s: FxDeskSetup): number[] {
  const reversed = r4((s.spot * (1 + s.iEur / 100)) / (1 + s.iUsd / 100));
  return [forward(s), reversed, s.spot].sort((x, y) => x - y);
}

/** Rentabilidad aproximada del carry trade (%): diferencial de tipos menos la depreciación. */
export const carryReturn = (s: FxDeskSetup) => r1(s.iHigh - s.iFund - s.depreciation);

/** Opciones: la buena, sin la depreciación y sumándola. */
export function carryOptions(s: FxDeskSetup): number[] {
  const diff = s.iHigh - s.iFund;
  return [carryReturn(s), diff, r1(diff + s.depreciation)].sort((x, y) => x - y);
}

export interface FxDeskAnswer {
  account: number;
  forward: number;
  carry: number;
  country: Country;
}

export interface FxDeskResult {
  accountHit: boolean;
  forwardHit: boolean;
  carryHit: boolean;
  countryHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function fxDeskResult(s: FxDeskSetup, a: FxDeskAnswer): FxDeskResult {
  const accountHit = a.account === currentAccount(s);
  const forwardHit = a.forward === forward(s);
  const carryHit = a.carry === carryReturn(s);
  const countryHit = a.country === s.vulnerable;
  return {
    accountHit,
    forwardHit,
    carryHit,
    countryHit,
    score: (+accountHit + +forwardHit + +carryHit + +countryHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function fxDeskValues(s: FxDeskSetup, a: FxDeskAnswer): Record<string, number> {
  const r = fxDeskResult(s, a);
  return {
    exports: s.exports,
    imports: s.imports,
    trade_balance: tradeBalance(s),
    income: s.income,
    current_account: currentAccount(s),
    spot: s.spot,
    i_eur: s.iEur,
    i_usd: s.iUsd,
    forward: forward(s),
    i_high: s.iHigh,
    i_fund: s.iFund,
    depreciation: s.depreciation,
    carry: carryReturn(s),
    hits: +r.accountHit + +r.forwardHit + +r.carryHit + +r.countryHit,
  };
}
