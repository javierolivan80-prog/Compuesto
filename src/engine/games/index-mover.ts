import { seededShuffle } from '../grading';
import { mulberry32 } from '../prng';

/*
 * «¿Quién mueve el índice?» (lección-juego de la planta 0, unidad «Bolsas e índices»): el índice ficticio Turia 6
 * reúne las seis cotizadas del universo y pondera cada una por su capitalización ajustada por free float. Cada
 * sesión ves cuánto se mueve cada empresa y predices cuánto se mueve el índice; después ves lo que aporta cada una
 * (peso × variación). Enseña que las grandes mueven el índice aunque se muevan poco. Sin topes de peso, a diferencia
 * del IBEX 35. Lógica pura y determinista por semilla.
 */

export interface IndexCompany {
  id: string;
  ticker: string;
  /** Acciones (companies.json, `sharesOutstanding`; un test comprueba que coinciden). */
  shares: number;
  /** Precio al empezar (€), cerca del de la cinta de La Mesa. */
  price: number;
  /** Porcentaje de acciones en manos de inversores que compran y venden (free float). */
  freeFloat: number;
}

export const COMPANIES: readonly IndexCompany[] = [
  { id: 'azahar-calderona', ticker: 'AZA', shares: 60_000_000, price: 19.6, freeFloat: 45 },
  { id: 'pirineo-energia', ticker: 'PIR', shares: 40_000_000, price: 12.2, freeFloat: 60 },
  { id: 'tramuntana-retail', ticker: 'TRA', shares: 18_000_000, price: 6.4, freeFloat: 70 },
  { id: 'mediterranea-de-navieras', ticker: 'MED', shares: 25_000_000, price: 6.2, freeFloat: 50 },
  { id: 'naranjas-del-turia', ticker: 'NAR', shares: 12_000_000, price: 9.5, freeFloat: 35 },
  { id: 'albufera-partners', ticker: 'ALB', shares: 5_000_000, price: 21.9, freeFloat: 30 },
];

export const BASE_POINTS = 1000;
export const SESSIONS = 4;
/** Rango del deslizador de la predicción (en %). */
export const GUESS_MIN = -3;
export const GUESS_MAX = 3;
export const GUESS_STEP = 0.1;

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Capitalización ajustada por free float de cada empresa (€) a unos precios dados. */
export const floatCaps = (prices: readonly number[]): number[] =>
  COMPANIES.map((c, i) => (prices[i]! * c.shares * c.freeFloat) / 100);

/** Pesos en % (suman 100). */
export function weights(prices: readonly number[]): number[] {
  const caps = floatCaps(prices);
  const total = caps.reduce((s, x) => s + x, 0);
  return caps.map((c) => (c / total) * 100);
}

/**
 * Tipos de sesión: lo que enseña cada una. `small-big`: una pequeña se dispara y la grande baja un poco (el índice
 * puede bajar); `big-up`: la grande sube y todas las demás bajan; `second-down`: cae la segunda; `all-up`: todo
 * sube un poco.
 */
export type SessionKind = 'small-big' | 'big-up' | 'second-down' | 'all-up';
const KINDS: readonly SessionKind[] = ['small-big', 'big-up', 'second-down', 'all-up'];

export interface IndexSession {
  kind: SessionKind;
  /** Variación de cada empresa en % (en el orden de COMPANIES), con 1 decimal. */
  moves: number[];
}

export interface IndexSetup {
  seed: number;
  sessions: IndexSession[];
}

export function setupIndex(seed: number): IndexSetup {
  const rnd = mulberry32(seed);
  const pick = (a: number, b: number) => Math.round((a + rnd() * (b - a)) * 10) / 10;
  const smalls = [2, 3, 4, 5]; // índices de las pequeñas en COMPANIES
  const sessions = seededShuffle(KINDS, `${seed}:sesiones`).map((kind): IndexSession => {
    const moves = COMPANIES.map(() => pick(-0.6, 0.6));
    if (kind === 'small-big') {
      moves[smalls[Math.floor(rnd() * smalls.length)]!] = pick(6, 9);
      moves[0] = pick(-1.4, -0.8);
    } else if (kind === 'big-up') {
      moves[0] = pick(1.5, 2.5);
      for (const i of [1, ...smalls]) moves[i] = pick(-1.2, -0.3);
    } else if (kind === 'second-down') {
      moves[1] = pick(-4.5, -3);
      moves[smalls[Math.floor(rnd() * smalls.length)]!] = pick(2, 4);
    } else for (let i = 0; i < moves.length; i++) moves[i] = pick(0.3, 1.2);
    return { kind, moves };
  });
  return { seed, sessions };
}

export interface SessionOutcome {
  /** Pesos en % al empezar la sesión. */
  weights: number[];
  /** Aportación de cada empresa en puntos porcentuales: peso × variación / 100. */
  contributions: number[];
  /** Variación del índice en %. */
  pct: number;
  /** Puntos del índice al cerrar la sesión. */
  level: number;
}

/** Recorre las sesiones: los pesos de cada día salen de los precios del cierre anterior. */
export function playSessions(setup: IndexSetup): SessionOutcome[] {
  let prices = COMPANIES.map((c) => c.price);
  let level = BASE_POINTS;
  return setup.sessions.map((s) => {
    const w = weights(prices);
    const contributions = w.map((wi, i) => (wi * s.moves[i]!) / 100);
    const pct = contributions.reduce((a, b) => a + b, 0);
    level = level * (1 + pct / 100);
    prices = prices.map((p, i) => p * (1 + s.moves[i]! / 100));
    return { weights: w, contributions, pct, level };
  });
}

/** Acierto de una predicción: 1 si fallas por ≤ 0,15 puntos porcentuales; 0,5 si ≤ 0,5; si no, 0. */
export function guessScore(guess: number, actual: number): number {
  const err = Math.abs(guess - actual);
  return err <= 0.15 + 1e-9 ? 1 : err <= 0.5 + 1e-9 ? 0.5 : 0;
}

export interface IndexState {
  setup: IndexSetup;
  guesses: number[];
  done: boolean;
}

export const startIndex = (setup: IndexSetup): IndexState => ({ setup, guesses: [], done: false });

export function guessIndex(s: IndexState, g: number): IndexState {
  if (s.done || !Number.isFinite(g)) return s;
  const clamped = Math.min(GUESS_MAX, Math.max(GUESS_MIN, Math.round(g * 10) / 10));
  const guesses = [...s.guesses, clamped];
  return { ...s, guesses, done: guesses.length >= s.setup.sessions.length };
}

export interface IndexResult {
  start: number;
  end: number;
  points: number;
  pct: number;
  /** Peso de la mayor empresa al empezar (%). */
  top: number;
  /** Sesiones con la predicción a ≤ 0,15 puntos. */
  hits: number;
  score: number;
}

export function indexResult(s: IndexState): IndexResult {
  const out = playSessions(s.setup);
  const end = out.at(-1)!.level;
  const scores = out.map((o, i) =>
    s.guesses[i] === undefined ? 0 : guessScore(s.guesses[i], o.pct),
  );
  return {
    start: BASE_POINTS,
    end: r2(end),
    points: r2(end - BASE_POINTS),
    pct: r2((end / BASE_POINTS - 1) * 100),
    top: r2(Math.max(...out[0]!.weights)),
    hits: scores.filter((x) => x === 1).length,
    score: Math.round((scores.reduce((a, b) => a + b, 0) / out.length) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}). */
export function indexValues(r: IndexResult): Record<string, number> {
  return { start: r.start, end: r.end, points: r.points, pct: r.pct, top: r.top, hits: r.hits };
}
