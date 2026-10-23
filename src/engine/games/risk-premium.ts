import { mulberry32 } from '../prng';

/*
 * «La prima de riesgo» (lección-juego de la planta 3, unidad «Ciclo, política fiscal y prima de riesgo»): la mesa
 * de Albufera Partners lee la economía de un país ficticio. Cuatro pasos:
 *   1. Fase del ciclo con una regla determinista (abajo, `phaseOf`).
 *   2. Rotación sectorial: en expansión y auge suelen ir mejor los cíclicos; en desaceleración y recesión, los
 *      defensivos.
 *   3. Prima de riesgo = (rentabilidad del bono a 10 años de España − la del Bund alemán) × 100, en puntos básicos.
 *   4. Deuda/PIB del año siguiente = (deuda + déficit) / (PIB × (1 + crecimiento nominal)).
 * Cifras ficticias.
 */

export type Phase = 'expansion' | 'boom' | 'slowdown' | 'recession';
export const PHASES: readonly Phase[] = ['expansion', 'boom', 'slowdown', 'recession'];
export type Sector = 'cyclical' | 'defensive';

export interface PremiumSetup {
  seed: number;
  /** Crecimiento del PIB real (%) y crecimiento potencial (%). */
  growth: number;
  potential: number;
  /** Inflación interanual del mes anterior y del mes actual (%). */
  inflPrev: number;
  inflNow: number;
  /** PMI compuesto (50 separa la expansión de la contracción de la actividad). */
  pmi: number;
  /** Rentabilidad del bono a 10 años de España y del Bund alemán (%). */
  spain: number;
  bund: number;
  /** Deuda pública, PIB nominal y déficit del año (miles de millones de €); crecimiento nominal del PIB (%). */
  debt: number;
  gdp: number;
  deficit: number;
  nominalGrowth: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupPremium(seed: number): PremiumSetup {
  if (seed === 0)
    return {
      seed,
      growth: 1,
      potential: 1.5,
      inflPrev: 3.4,
      inflNow: 3.2,
      pmi: 50.8,
      spain: 3.45,
      bund: 2.6,
      debt: 1050,
      gdp: 1000,
      deficit: 30,
      nominalGrowth: 4,
    };
  const rnd = mulberry32(seed);
  const phase = pick(rnd, PHASES);
  const potential = pick(rnd, [1.5, 2]);
  let growth: number, inflPrev: number, inflNow: number, pmi: number;
  if (phase === 'expansion') {
    growth = potential + pick(rnd, [0.5, 1, 1.5]);
    inflPrev = pick(rnd, [2.4, 2.7, 3]);
    inflNow = inflPrev - pick(rnd, [0.2, 0.3, 0.4]);
    pmi = pick(rnd, [52.4, 53.1, 54.2]);
  } else if (phase === 'boom') {
    growth = potential + pick(rnd, [1, 1.5, 2]);
    inflPrev = pick(rnd, [2.5, 2.8, 3.1]);
    inflNow = inflPrev + pick(rnd, [0.3, 0.5, 0.7]);
    pmi = pick(rnd, [55.3, 56.8, 57.6]);
  } else if (phase === 'slowdown') {
    growth = potential - pick(rnd, [0.5, 0.8, 1]);
    inflPrev = pick(rnd, [3, 3.4, 3.8]);
    inflNow = inflPrev + pick(rnd, [-0.2, 0.2]);
    pmi = pick(rnd, [50.4, 50.9, 51.6]);
  } else {
    growth = pick(rnd, [-0.8, -0.5, -0.2]);
    inflPrev = pick(rnd, [2.6, 3, 3.4]);
    inflNow = inflPrev - pick(rnd, [0.4, 0.6, 0.8]);
    pmi = pick(rnd, [45.3, 46.8, 48.2]);
  }
  const bund = pick(rnd, [2.2, 2.35, 2.5, 2.6, 2.75]);
  const spreadBp = pick(rnd, [55, 70, 85, 100, 120, 150, 180, 210, 245]);
  const gdp = pick(rnd, [1000, 1200]);
  const ratio0 = pick(rnd, [65, 70, 80, 90, 100, 110]);
  const deficitPct = pick(rnd, [1, 2, 3, 4, 5]);
  return {
    seed,
    growth: r1(growth),
    potential,
    inflPrev: r1(inflPrev),
    inflNow: r1(inflNow),
    pmi,
    spain: r2(bund + spreadBp / 100),
    bund,
    debt: (gdp * ratio0) / 100,
    gdp,
    deficit: (gdp * deficitPct) / 100,
    nominalGrowth: pick(rnd, [2, 3, 4, 5, 6]),
  };
}

/**
 * Regla de la mesa (simplificada, documentada en la ficha):
 *   - PIB por encima de su potencial: con la inflación subiendo → auge (sobrecalentamiento); bajando → expansión.
 *   - PIB por debajo de su potencial: con el PMI por encima de 50 (la actividad aún crece) → desaceleración; por
 *     debajo de 50 → recesión.
 */
export function phaseOf(s: PremiumSetup): Phase {
  if (s.growth > s.potential) return s.inflNow > s.inflPrev ? 'boom' : 'expansion';
  return s.pmi > 50 ? 'slowdown' : 'recession';
}

/** En expansión y auge suelen ir mejor los cíclicos; en desaceleración y recesión, los defensivos. */
export const sectorFor = (p: Phase): Sector =>
  p === 'expansion' || p === 'boom' ? 'cyclical' : 'defensive';

/** Prima de riesgo (pb): diferencia de rentabilidades × 100. */
export const spreadBp = (s: PremiumSetup) => Math.round((s.spain - s.bund) * 100);

/** Opciones de la prima: la buena, sin multiplicar por 100 y al revés (Bund − España). */
export function spreadOptions(s: PremiumSetup): number[] {
  const bp = spreadBp(s);
  return [bp, r2(bp / 100), -bp].sort((a, b) => a - b);
}

/** Deuda/PIB de partida (%, 1 decimal). */
export const debtRatio0 = (s: PremiumSetup) => r1((s.debt / s.gdp) * 100);

/** Deuda/PIB del año siguiente (%, 1 decimal): la deuda suma el déficit y el PIB crece al ritmo nominal. */
export const nextRatio = (s: PremiumSetup) =>
  r1(((s.debt + s.deficit) / (s.gdp * (1 + s.nominalGrowth / 100))) * 100);

/** Opciones de deuda/PIB: la buena, sin crecer el PIB y sin sumar el déficit. */
export function ratioOptions(s: PremiumSetup): number[] {
  const noGrowth = r1(((s.debt + s.deficit) / s.gdp) * 100);
  const noDeficit = r1((s.debt / (s.gdp * (1 + s.nominalGrowth / 100))) * 100);
  return [nextRatio(s), noGrowth, noDeficit].sort((a, b) => a - b);
}

export interface PremiumAnswer {
  phase: Phase;
  sector: Sector;
  spread: number;
  ratio: number;
}

export interface PremiumResult {
  phaseHit: boolean;
  sectorHit: boolean;
  spreadHit: boolean;
  ratioHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. La rotación se corrige con la fase real, no con la que eligió el jugador. */
export function premiumResult(s: PremiumSetup, a: PremiumAnswer): PremiumResult {
  const phaseHit = a.phase === phaseOf(s);
  const sectorHit = a.sector === sectorFor(phaseOf(s));
  const spreadHit = a.spread === spreadBp(s);
  const ratioHit = a.ratio === nextRatio(s);
  return {
    phaseHit,
    sectorHit,
    spreadHit,
    ratioHit,
    score: (+phaseHit + +sectorHit + +spreadHit + +ratioHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function premiumValues(s: PremiumSetup, a: PremiumAnswer): Record<string, number> {
  const r = premiumResult(s, a);
  return {
    growth: s.growth,
    potential: s.potential,
    infl_prev: s.inflPrev,
    infl_now: s.inflNow,
    pmi: s.pmi,
    spain: s.spain,
    bund: s.bund,
    spread_bp: spreadBp(s),
    debt: s.debt,
    gdp: s.gdp,
    deficit: s.deficit,
    nominal_growth: s.nominalGrowth,
    debt_ratio0: debtRatio0(s),
    debt_ratio1: nextRatio(s),
    hits: +r.phaseHit + +r.sectorHit + +r.spreadHit + +r.ratioHit,
  };
}
