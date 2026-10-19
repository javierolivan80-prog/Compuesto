import { mulberry32 } from '../prng';

/*
 * «Dos fondos, veinte años» (lección-juego de la planta 2, unidad «Fondos, ETF y comisiones»). Tres pasos:
 *   1. La comisión que no ves: dos fondos que invierten igual (misma rentabilidad bruta) y solo se distinguen por sus
 *      gastos corrientes (TER). Predices cuánto más acumula el barato y lo ves año a año.
 *   2. ¿Fondo o ETF?: clasificas situaciones según convenga uno u otro.
 *   3. ¿Traspaso o reembolso?: para pasarte al fondo barato, eliges entre traspasar (sin tributar ahora) o vender y
 *      volver a comprar (tributas ya la ganancia y reinviertes menos).
 * Rentabilidad neta = bruta − TER, compuesta anual (simplificación). Tipo del IRPF del ahorro, ilustrativo.
 */

export const YEARS = 20;
export const INITIAL = 10000;
/** Tipo ilustrativo del IRPF sobre la ganancia del reembolso (primer tramo de la base del ahorro). */
export const TAX = 0.19;

export interface FundSetup {
  seed: number;
  /** Rentabilidad bruta anual (%) y gastos corrientes de los dos fondos (%). */
  gross: number;
  terDear: number;
  terCheap: number;
  /** Valor del fondo caro y ganancia acumulada cuando decides cambiarte (€). */
  value: number;
  gain: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

export function setupFunds(seed: number): FundSetup {
  if (seed === 0) return { seed, gross: 6, terDear: 1.8, terCheap: 0.2, value: 14000, gain: 4000 };
  const rnd = mulberry32(seed);
  const gain = pick(rnd, [2000, 4000, 6000]);
  return {
    seed,
    gross: pick(rnd, [5, 6, 7]),
    terDear: pick(rnd, [1.5, 1.8, 2]),
    terCheap: pick(rnd, [0.1, 0.2, 0.3]),
    value: INITIAL + gain,
    gain,
  };
}

const r0 = (x: number) => Math.round(x);

/** Valor al cabo de `years` años de `amount` € con una rentabilidad neta de gross − ter (%). */
export const grow = (amount: number, gross: number, ter: number, years: number) =>
  amount * (1 + (gross - ter) / 100) ** years;

/** Valor final de los 10.000 € en cada fondo y la diferencia (€). */
export function finals(s: FundSetup) {
  const dear = grow(INITIAL, s.gross, s.terDear, YEARS);
  const cheap = grow(INITIAL, s.gross, s.terCheap, YEARS);
  return { dear, cheap, diff: cheap - dear };
}

/** Opciones de la diferencia (€): la buena, la de restar solo los TER sin componer y una exagerada. */
export function diffOptions(s: FundSetup): number[] {
  const good = r0(finals(s).diff / 100) * 100;
  const naive = r0((INITIAL * (s.terDear - s.terCheap) * YEARS) / 100 / 100) * 100;
  const big = r0(finals(s).cheap / 100) * 100 - INITIAL;
  return [...new Set([good, naive, big])].sort((a, b) => a - b);
}
export const rightDiff = (s: FundSetup) => r0(finals(s).diff / 100) * 100;

/** Situaciones del paso 2: dónde encaja mejor cada una. */
export const SITUATIONS = [
  { id: 'intraday', right: 'etf' },
  { id: 'switchFree', right: 'fund' },
  { id: 'stockBroker', right: 'etf' },
  { id: 'periodic', right: 'fund' },
] as const;
export type Vehicle = 'fund' | 'etf';

/** Paso 3: lo que tendrías a los `YEARS` años de pasar al fondo barato, traspasando o vendiendo. */
export function switchOutcome(s: FundSetup, transfer: boolean) {
  const tax = transfer ? 0 : s.gain * TAX;
  const invested = s.value - tax;
  const end = grow(invested, s.gross, s.terCheap, YEARS);
  return { tax, invested, end };
}

export interface FundAnswer {
  diff: number;
  /** Respuesta de cada situación, en el orden de SITUATIONS. */
  vehicles: Vehicle[];
  transfer: boolean;
}

export interface FundResult {
  diffHit: boolean;
  vehicleHits: number;
  transferHit: boolean;
  score: number;
}

/** Nota: 35 % la diferencia, 35 % las situaciones (a partes iguales) y 30 % traspasar. */
export function fundResult(s: FundSetup, a: FundAnswer): FundResult {
  const diffHit = a.diff === rightDiff(s);
  const vehicleHits = SITUATIONS.filter((x, i) => a.vehicles[i] === x.right).length;
  return {
    diffHit,
    vehicleHits,
    transferHit: a.transfer,
    score:
      Math.round(
        (0.35 * +diffHit + (0.35 * vehicleHits) / SITUATIONS.length + 0.3 * +a.transfer) * 1000,
      ) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function fundValues(s: FundSetup, a: FundAnswer): Record<string, number> {
  const f = finals(s);
  const tr = switchOutcome(s, true);
  const sell = switchOutcome(s, false);
  return {
    gross: s.gross,
    ter_dear: s.terDear,
    ter_cheap: s.terCheap,
    net_dear: s.gross - s.terDear,
    net_cheap: s.gross - s.terCheap,
    years: YEARS,
    initial: INITIAL,
    final_dear: r0(f.dear),
    final_cheap: r0(f.cheap),
    diff: r0(f.diff),
    value: s.value,
    gain: s.gain,
    tax_rate: TAX * 100,
    tax: r0(sell.tax),
    reinvested: r0(sell.invested),
    end_transfer: r0(tr.end),
    end_sell: r0(sell.end),
    end_gap: r0(tr.end - sell.end),
    vehicle_hits: fundResult(s, a).vehicleHits,
  };
}
