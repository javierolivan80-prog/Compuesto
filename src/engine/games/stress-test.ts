import { mulberry32 } from '../prng';

/*
 * «Stress test» (lección-juego de la planta 3, unidad «Por dentro de un banco»; ficha 12 de JUEGOS.md): el equipo de
 * Albufera Partners asesora a Banca Malvarrosa, un banco comercial ficticio, en plena crisis. Cuatro pasos:
 *   1. Margen de intereses = préstamos × tipo de los préstamos − depósitos × tipo de los depósitos.
 *   2. Ratio CET1 = capital CET1 / activos ponderados por riesgo (APR), con ponderaciones simplificadas: hipotecas al
 *      35 % y préstamos a empresas al 100 %.
 *   3. Test de estrés: el escenario adverso resta pérdidas al CET1 y sube los APR; ratio estresado =
 *      (CET1 − pérdidas) / (APR × (1 + subida)). Se compara con el 7 % (4,5 % de pilar 1 + 2,5 % de colchón).
 *   4. LCR = activos líquidos de alta calidad / (salidas − entradas de 30 días).
 * Cifras ficticias, en millones de €.
 */

/** Ponderación simplificada de las hipotecas y de los préstamos a empresas (%). */
export const W_MORTGAGE = 35;
export const W_CORPORATE = 100;
/** Pilar 1 (4,5 %) más el colchón de conservación (2,5 %): el CET1 que la partida usa como referencia (%). */
export const CET1_REFERENCE = 7;

export interface StressSetup {
  seed: number;
  /** Préstamos y depósitos (M€) y sus tipos (%). */
  loans: number;
  deposits: number;
  rLoans: number;
  rDeposits: number;
  /** Préstamos hipotecarios y a empresas (M€; suman `loans`) y capital CET1 (M€). */
  mortgages: number;
  corporates: number;
  cet1: number;
  /** Proporciones con las que se sortean el CET1 y las pérdidas (sobre los APR) y los activos líquidos (sobre las salidas netas). */
  kCet1: number;
  mLoss: number;
  kHqla: number;
  /** Escenario adverso: pérdidas (M€) y subida de los APR (%). */
  losses: number;
  aprRise: number;
  /** Liquidez a 30 días (M€): activos líquidos de alta calidad, salidas y entradas. */
  hqla: number;
  outflows: number;
  inflows: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const round10 = (x: number) => Math.round(x / 10) * 10;

export function setupStress(seed: number): StressSetup {
  if (seed === 0)
    return {
      seed,
      loans: 20_000,
      deposits: 18_000,
      rLoans: 4,
      rDeposits: 1,
      mortgages: 12_000,
      corporates: 8_000,
      kCet1: 0.13,
      mLoss: 0.04,
      kHqla: 1.5,
      cet1: 1_590,
      losses: 490,
      aprRise: 10,
      hqla: 2_700,
      outflows: 2_400,
      inflows: 600,
    };
  const rnd = mulberry32(seed);
  const loans = pick(rnd, [16_000, 20_000, 24_000]);
  // nunca al 50 %: con las dos carteras iguales, las ponderaciones al revés darían los mismos APR
  const mortgages = loans * pick(rnd, [0.6, 0.7]);
  const corporates = loans - mortgages;
  const apr = (mortgages * W_MORTGAGE + corporates * W_CORPORATE) / 100;
  const outflows = pick(rnd, [2_000, 2_400, 2_800]);
  const inflows = pick(rnd, [400, 600, 800]);
  const kCet1 = pick(rnd, [0.12, 0.13, 0.14, 0.15]);
  // desde el 2,5 %: con un 2 %, en algún banco las pérdidas igualaban un distractor
  const mLoss = pick(rnd, [0.025, 0.03, 0.04, 0.05]);
  const kHqla = pick(rnd, [1.1, 1.3, 1.5, 1.8]);
  return {
    seed,
    loans,
    deposits: loans * pick(rnd, [0.85, 0.9]),
    rLoans: pick(rnd, [3.5, 4, 4.5]),
    rDeposits: pick(rnd, [0.5, 1, 1.5]),
    mortgages,
    corporates,
    kCet1,
    mLoss,
    kHqla,
    cet1: round10(apr * kCet1),
    losses: round10(apr * mLoss),
    aprRise: pick(rnd, [5, 10, 15]),
    hqla: round10((outflows - inflows) * kHqla),
    outflows,
    inflows,
  };
}

/** Margen de intereses (M€). */
export const nii = (s: StressSetup) => (s.loans * s.rLoans - s.deposits * s.rDeposits) / 100;

/** Opciones: la buena, el diferencial de tipos por los préstamos y solo los intereses cobrados. */
export function niiOptions(s: StressSetup): number[] {
  return [nii(s), (s.loans * (s.rLoans - s.rDeposits)) / 100, (s.loans * s.rLoans) / 100].sort(
    (a, b) => a - b,
  );
}

/** Activos ponderados por riesgo (M€). */
export const apr = (s: StressSetup) =>
  (s.mortgages * W_MORTGAGE + s.corporates * W_CORPORATE) / 100;

/** Ratio CET1 (%, 1 decimal). */
export const cet1Ratio = (s: StressSetup) => r1((s.cet1 / apr(s)) * 100);

/** Opciones: la buena, sobre los préstamos sin ponderar y con las ponderaciones al revés. */
export function cet1Options(s: StressSetup): number[] {
  const swapped = (s.mortgages * W_CORPORATE + s.corporates * W_MORTGAGE) / 100;
  return [cet1Ratio(s), r1((s.cet1 / s.loans) * 100), r1((s.cet1 / swapped) * 100)].sort(
    (a, b) => a - b,
  );
}

/** Ratio CET1 tras el escenario adverso (%, 1 decimal). */
export const stressedRatio = (s: StressSetup) =>
  r1(((s.cet1 - s.losses) / (apr(s) * (1 + s.aprRise / 100))) * 100);

/** Opciones: la buena, sin subir los APR y sin restar las pérdidas. */
export function stressOptions(s: StressSetup): number[] {
  return [
    stressedRatio(s),
    r1(((s.cet1 - s.losses) / apr(s)) * 100),
    r1((s.cet1 / (apr(s) * (1 + s.aprRise / 100))) * 100),
  ].sort((a, b) => a - b);
}

/** LCR (%, 1 decimal). */
export const lcr = (s: StressSetup) => r1((s.hqla / (s.outflows - s.inflows)) * 100);

/** Opciones: la buena, sin restar las entradas y el cociente al revés. */
export function lcrOptions(s: StressSetup): number[] {
  return [
    lcr(s),
    r1((s.hqla / s.outflows) * 100),
    r1(((s.outflows - s.inflows) / s.hqla) * 100),
  ].sort((a, b) => a - b);
}

export interface StressAnswer {
  nii: number;
  cet1: number;
  stressed: number;
  lcr: number;
}

export interface StressResult {
  niiHit: boolean;
  cet1Hit: boolean;
  stressedHit: boolean;
  lcrHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function stressResult(s: StressSetup, a: StressAnswer): StressResult {
  const niiHit = a.nii === nii(s);
  const cet1Hit = a.cet1 === cet1Ratio(s);
  const stressedHit = a.stressed === stressedRatio(s);
  const lcrHit = a.lcr === lcr(s);
  return {
    niiHit,
    cet1Hit,
    stressedHit,
    lcrHit,
    score: (+niiHit + +cet1Hit + +stressedHit + +lcrHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function stressValues(s: StressSetup, a: StressAnswer): Record<string, number> {
  const r = stressResult(s, a);
  return {
    loans: s.loans,
    deposits: s.deposits,
    r_loans: s.rLoans,
    r_deposits: s.rDeposits,
    nii: nii(s),
    mortgages: s.mortgages,
    corporates: s.corporates,
    apr: apr(s),
    cet1: s.cet1,
    k_cet1: s.kCet1,
    m_loss: s.mLoss,
    k_hqla: s.kHqla,
    cet1_ratio: cet1Ratio(s),
    losses: s.losses,
    apr_rise: s.aprRise,
    stressed_ratio: stressedRatio(s),
    hqla: s.hqla,
    outflows: s.outflows,
    inflows: s.inflows,
    lcr: lcr(s),
    hits: +r.niiHit + +r.cet1Hit + +r.stressedHit + +r.lcrHit,
  };
}
