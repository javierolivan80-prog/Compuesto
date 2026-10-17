import { mulberry32 } from './prng';

/* Motor de mercados sintéticos para los juegos (docs/JUEGOS.md, tarea 2.4): movimiento browniano geométrico
   con saltos y regímenes. Determinista por semilla; no usa datos reales ni relojes. */

export interface Regime {
  name: string;
  /** Deriva por paso (rentabilidad esperada simple). */
  mu: number;
  /** Volatilidad por paso (desviación típica del log-rendimiento). */
  sigma: number;
}

export const DEFAULT_REGIMES: readonly Regime[] = [
  { name: 'calma', mu: 0.0004, sigma: 0.006 },
  { name: 'tendencia alcista', mu: 0.0012, sigma: 0.009 },
  { name: 'pánico', mu: -0.002, sigma: 0.022 },
];

export interface MarketConfig {
  seed: number;
  steps: number;
  start?: number;
  regimes?: readonly Regime[];
  /** Probabilidad por paso de cambiar de régimen (0 = siempre el primero). */
  switchProb?: number;
  /** Probabilidad por paso de un salto (noticia, gap). */
  jumpProb?: number;
  /** Media y desviación del salto en log-rendimiento. */
  jumpMean?: number;
  jumpSd?: number;
}

export interface MarketPath {
  /** steps + 1 precios (el primero es el inicial). */
  prices: number[];
  /** Régimen vigente en cada paso (índice en `regimes`), longitud = steps. */
  regimes: number[];
  /** Pasos (0-based) en que hubo salto. */
  jumps: number[];
}

/** Normal estándar por Box–Muller sobre el PRNG con semilla. */
function normal(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-12);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function marketPath(cfg: MarketConfig): MarketPath {
  const {
    seed,
    steps,
    start = 100,
    regimes = DEFAULT_REGIMES,
    switchProb = 0.02,
    jumpProb = 0.01,
    jumpMean = -0.01,
    jumpSd = 0.04,
  } = cfg;
  if (steps < 0 || !Number.isInteger(steps)) throw new Error('steps debe ser un entero ≥ 0');
  if (regimes.length === 0) throw new Error('hace falta al menos un régimen');
  const rnd = mulberry32(seed);
  const prices = [start];
  const used: number[] = [];
  const jumps: number[] = [];
  let regime = 0;
  for (let i = 0; i < steps; i++) {
    if (regimes.length > 1 && rnd() < switchProb) {
      // salta a otro régimen distinto, elegido uniformemente
      const next = Math.floor(rnd() * (regimes.length - 1));
      regime = next >= regime ? next + 1 : next;
    }
    used.push(regime);
    const { mu, sigma } = regimes[regime]!;
    // log-rendimiento con corrección de Itô para que E[S_{t+1}/S_t] = 1 + mu
    let r = Math.log1p(mu) - (sigma * sigma) / 2 + sigma * normal(rnd);
    if (rnd() < jumpProb) {
      r += jumpMean + jumpSd * normal(rnd);
      jumps.push(i);
    }
    prices.push(prices[i]! * Math.exp(r));
  }
  return { prices, regimes: used, jumps };
}

/** Log-rendimientos de una serie de precios. */
export const logReturns = (prices: readonly number[]): number[] =>
  prices.slice(1).map((p, i) => Math.log(p / prices[i]!));
