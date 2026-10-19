import { mulberry32 } from '../prng';

/*
 * «Una noche en la tesorería» (lección-juego de la planta 2, unidad «Mercado monetario, repo, cédulas y
 * titulizaciones»): la tesorería de Albufera Partners necesita liquidez para esta noche. Tres pasos:
 *   1. Repo: entrega bonos del Estado como garantía con un recorte (haircut). ¿Cuánto le prestan?
 *   2. Intereses: a un día, al tipo del repo, con la convención actual/360 del mercado monetario del euro.
 *   3. Cédula o titulización: ¿en cuál el inversor puede reclamar al banco además de a los préstamos?
 * Tipos y garantías ficticios.
 */

export interface RepoSetup {
  seed: number;
  /** Valor de mercado de los bonos entregados (millones de €), recorte (%) y tipo del repo (%). */
  collateral: number;
  haircut: number;
  rate: number;
  /** Días del préstamo. */
  days: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupRepo(seed: number): RepoSetup {
  if (seed === 0) return { seed, collateral: 10, haircut: 2, rate: 3.2, days: 1 };
  const rnd = mulberry32(seed);
  return {
    seed,
    collateral: pick(rnd, [10, 20, 50]),
    haircut: pick(rnd, [1, 2, 5]),
    rate: pick(rnd, [2.5, 3.2, 4]),
    days: pick(rnd, [1, 7]),
  };
}

/** Lo que se presta (millones de €): el valor de la garantía menos el recorte. */
export const loan = (s: RepoSetup) => r2(s.collateral * (1 - s.haircut / 100));
/** Intereses en euros, actual/360. */
export const interest = (s: RepoSetup) => Math.round((loan(s) * 1e6 * s.rate * s.days) / 100 / 360);

/** Opciones del préstamo: la buena, sin recorte y sumando el recorte. */
export const loanOptions = (s: RepoSetup) =>
  [loan(s), s.collateral, r2(s.collateral * (1 + s.haircut / 100))].sort((a, b) => a - b);

/** Opciones de intereses: la buena, con 365 días y con un año entero. */
export function interestOptions(s: RepoSetup): number[] {
  const y365 = Math.round((loan(s) * 1e6 * s.rate * s.days) / 100 / 365);
  const year = Math.round((loan(s) * 1e6 * s.rate) / 100);
  return [...new Set([interest(s), y365, year])].sort((a, b) => a - b);
}

export type Instrument = 'cedula' | 'titulizacion';

export interface RepoAnswer {
  loan: number;
  interest: number;
  recourse: Instrument;
}

export interface RepoResult {
  loanHit: boolean;
  interestHit: boolean;
  recourseHit: boolean;
  score: number;
}

/** Nota: un tercio por paso. La cédula da recurso al banco emisor además de a la cartera hipotecaria. */
export function repoResult(s: RepoSetup, a: RepoAnswer): RepoResult {
  const loanHit = a.loan === loan(s);
  const interestHit = a.interest === interest(s);
  const recourseHit = a.recourse === 'cedula';
  return {
    loanHit,
    interestHit,
    recourseHit,
    score: Math.round(((+loanHit + +interestHit + +recourseHit) / 3) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function repoValues(s: RepoSetup, a: RepoAnswer): Record<string, number> {
  const r = repoResult(s, a);
  return {
    collateral: s.collateral,
    haircut: s.haircut,
    rate: s.rate,
    days: s.days,
    loan: loan(s),
    interest: interest(s),
    repay: Math.round(loan(s) * 1e6 + interest(s)),
    hits: +r.loanHit + +r.interestHit + +r.recourseHit,
  };
}
