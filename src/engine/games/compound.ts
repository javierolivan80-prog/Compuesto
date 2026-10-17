import { mulberry32 } from '../prng';
import { addTally, emptyTally, hashSeed, makeResult, type GameResult } from './common';

/* La magia del compuesto (juego 10): aportación mensual y años; comisiones e inflación se comen el resultado. */

export interface GrowthParams {
  monthly: number;
  years: number;
  /** Rentabilidad nominal anual en %. */
  returnPct: number;
  /** Comisión anual sobre el patrimonio en %. */
  feePct: number;
  /** Inflación anual en %. */
  inflationPct: number;
}

export interface GrowthPoint {
  year: number;
  /** Lo aportado en total (sin intereses). */
  contributed: number;
  /** Sin comisiones, en euros nominales. */
  gross: number;
  /** Tras comisiones, en euros nominales. */
  net: number;
  /** Tras comisiones y en euros de hoy. */
  real: number;
}

/** Capitalización mensual: rentabilidad y comisión se aplican cada mes (tipo mensual equivalente); aportación a fin de mes. */
export function growth(p: GrowthParams): GrowthPoint[] {
  const mGross = Math.pow(1 + p.returnPct / 100, 1 / 12) - 1;
  const mNet = Math.pow(1 + (p.returnPct - p.feePct) / 100, 1 / 12) - 1;
  const mInf = Math.pow(1 + p.inflationPct / 100, 1 / 12);
  const out: GrowthPoint[] = [{ year: 0, contributed: 0, gross: 0, net: 0, real: 0 }];
  let gross = 0;
  let net = 0;
  for (let y = 1; y <= p.years; y++) {
    for (let m = 0; m < 12; m++) {
      gross = gross * (1 + mGross) + p.monthly;
      net = net * (1 + mNet) + p.monthly;
    }
    out.push({
      year: y,
      contributed: p.monthly * 12 * y,
      gross,
      net,
      real: net / Math.pow(mInf, 12 * y),
    });
  }
  return out;
}

export const finalOf = (p: GrowthParams): GrowthPoint => growth(p).at(-1)!;

/** Lo que se llevan las comisiones y la inflación al final (para los pops «−42.000 € por comisiones»). */
export function leaks(p: GrowthParams): { fees: number; inflation: number } {
  const f = finalOf(p);
  return { fees: f.gross - f.net, inflation: f.net - f.real };
}

export interface CompoundRound {
  /** Objetivo en euros de hoy (netos de comisiones). */
  target: number;
  returnPct: number;
  feePct: number;
  inflationPct: number;
  /** Límites de los controles. */
  monthlyMin: number;
  monthlyMax: number;
  monthlyStep: number;
  yearsMin: number;
  yearsMax: number;
}

export const COMPOUND_ROUNDS = 4;

/** Rondas deterministas por semilla: el objetivo siempre es alcanzable dentro de los controles. */
export function compoundRounds(seed: number): CompoundRound[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: COMPOUND_ROUNDS }, (_, i) => {
    const base = {
      returnPct: [5, 6, 7][Math.floor(rnd() * 3)]!,
      feePct: [0.5, 1, 1.5, 2][Math.floor(rnd() * 4)]!,
      inflationPct: [2, 2.5, 3][Math.floor(rnd() * 3)]!,
      monthlyMin: 25,
      monthlyMax: 1000,
      monthlyStep: 25,
      yearsMin: 5,
      yearsMax: 40,
    };
    // objetivo a partir de una solución oculta con aportación y años razonables, redondeado a miles
    const monthly = (4 + Math.floor(rnd() * 16)) * 25 + i * 0;
    const years = 15 + Math.floor(rnd() * 20);
    const real = finalOf({ ...base, monthly, years }).real;
    return { ...base, target: Math.max(5000, Math.round(real / 1000) * 1000) };
  });
}

/** Puntuación de una ronda: 1 si el resultado en euros de hoy coincide con el objetivo; baja al alejarse (factor 2 → 0). */
export function roundScore(value: number, target: number): number {
  if (value <= 0) return 0;
  return Math.max(0, 1 - Math.abs(Math.log(value / target)) / Math.log(2));
}

export interface CompoundChoice {
  monthly: number;
  years: number;
}

export function playCompound(seed: number, choices: readonly CompoundChoice[]): GameResult {
  const rounds = compoundRounds(seed);
  let tally = emptyTally();
  const missed = new Set<string>();
  let totalFees = 0;
  rounds.forEach((r, i) => {
    const c = choices[i] ?? { monthly: r.monthlyMin, years: r.yearsMin };
    const value = finalOf({ ...r, ...c }).real;
    const s = roundScore(value, r.target);
    // el azar medio de este juego es bajo pero no nulo: se mide empíricamente (ver tests) y se resta como `chance`
    tally = addTally(tally, s, CHANCE_PER_ROUND);
    if (s < 0.6) {
      missed.add('interes-compuesto');
      missed.add('inflacion');
    }
    totalFees += leaks({ ...r, ...c }).fees;
  });
  return makeResult(
    'magia-compuesto',
    seed,
    tally,
    missed,
    'Las comisiones y la inflación se comen una parte enorme del interés compuesto: cada punto de comisión pesa más cuantos más años pasan.',
    `Las comisiones de tus carteras suman ${Math.round(totalFees).toLocaleString('es-ES')} € a lo largo de los años.`,
  );
}

/** Puntuación media de una partida al azar (calibrada con `randomBaseline`; ver tests). */
export const CHANCE_PER_ROUND = 0.21;

/** Jugador al azar: aportación y años uniformes dentro de los controles. Para calibrar y para el test de JUEGOS §5. */
export function randomChoices(seed: number): CompoundChoice[] {
  const rnd = mulberry32(hashSeed(`azar:${seed}`));
  return compoundRounds(seed).map((r) => ({
    monthly:
      r.monthlyMin +
      Math.floor(rnd() * ((r.monthlyMax - r.monthlyMin) / r.monthlyStep + 1)) * r.monthlyStep,
    years: r.yearsMin + Math.floor(rnd() * (r.yearsMax - r.yearsMin + 1)),
  }));
}
