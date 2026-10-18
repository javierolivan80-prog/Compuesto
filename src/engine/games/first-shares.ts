import { seededShuffle } from '../grading';
import { mulberry32 } from '../prng';

/*
 * «Tus primeras acciones» (lección-juego de la planta 0, unidad 1): tienes 100 acciones de Naranjas del Turia y
 * llegan cinco noticias de la empresa. Predices si la acción sube, baja o apenas se mueve, y ves cómo cambian el
 * precio, la capitalización y lo que valen tus acciones. Enseña que una acción es una parte de la empresa, que el
 * precio se mueve con lo que se espera que gane (la sorpresa, no lo ya sabido) y qué es la capitalización.
 * Lógica pura y determinista por semilla; los textos de las noticias están en es.json (`firstShares.news`).
 */

/** Acciones de Naranjas del Turia (companies.json, `sharesOutstanding`; un test comprueba que coinciden). */
export const SHARES = 12_000_000;
/** Las acciones que tienes tú. */
export const STAKE = 100;
export const ROUNDS = 5;

export type Move = 'up' | 'down' | 'flat';

export interface NewsItem {
  id: string;
  move: Move;
}

/** Banco de noticias de la empresa: qué hacen con lo que se espera que gane. */
export const NEWS_BANK: readonly NewsItem[] = [
  { id: 'contrato', move: 'up' },
  { id: 'beneficioMas', move: 'up' },
  { id: 'japon', move: 'up' },
  { id: 'helada', move: 'down' },
  { id: 'cliente', move: 'down' },
  { id: 'beneficioMenos', move: 'down' },
  { id: 'enLinea', move: 'flat' },
  { id: 'envases', move: 'flat' },
  { id: 'feria', move: 'flat' },
];

/** Dos noticias que suben, dos que bajan y una que no cambia nada, en orden según la semilla. */
const PATTERN: readonly Move[] = ['up', 'down', 'flat', 'up', 'down'];

export interface FirstSharesRound {
  news: NewsItem;
  /** Variación del precio en tanto por ciento (p. ej. 3.5 = +3,5 %). */
  pct: number;
}

export interface FirstSharesSetup {
  seed: number;
  /** Precio al empezar (€). */
  start: number;
  /** Porcentaje de acciones que cotiza libremente (el resto es de la familia fundadora). */
  freeFloat: number;
  rounds: FirstSharesRound[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupFirstShares(seed: number): FirstSharesSetup {
  const rnd = mulberry32(seed);
  const start = r2(9 + Math.floor(rnd() * 100) / 100);
  const freeFloat = [35, 40, 45][Math.floor(rnd() * 3)]!;
  const order = seededShuffle(PATTERN, `${seed}:orden`);
  const pools: Record<Move, NewsItem[]> = {
    up: seededShuffle(
      NEWS_BANK.filter((n) => n.move === 'up'),
      `${seed}:up`,
    ),
    down: seededShuffle(
      NEWS_BANK.filter((n) => n.move === 'down'),
      `${seed}:down`,
    ),
    flat: seededShuffle(
      NEWS_BANK.filter((n) => n.move === 'flat'),
      `${seed}:flat`,
    ),
  };
  const rounds = order.map((move) => {
    const news = pools[move].shift()!;
    // subidas y bajadas entre el 2,5 % y el 6 % (en pasos de 0,5); sin noticia nueva, entre −0,4 % y +0,4 %
    const pct =
      move === 'flat'
        ? r2((Math.floor(rnd() * 9) - 4) / 10)
        : (move === 'up' ? 1 : -1) * (2.5 + Math.floor(rnd() * 8) * 0.5);
    return { news, pct };
  });
  return { seed, start, freeFloat, rounds };
}

/** Precios tras cada noticia (el primero es el de partida), redondeados al céntimo como en bolsa. */
export function pricePath(setup: FirstSharesSetup): number[] {
  const out = [setup.start];
  for (const r of setup.rounds) out.push(r2(out.at(-1)! * (1 + r.pct / 100)));
  return out;
}

/** «Apenas se mueve» acierta en las noticias sin información nueva; sube/baja, en las demás. */
export const isHit = (round: FirstSharesRound, guess: Move): boolean => guess === round.news.move;

export interface FirstSharesState {
  setup: FirstSharesSetup;
  guesses: Move[];
  done: boolean;
}

export const startFirstShares = (setup: FirstSharesSetup): FirstSharesState => ({
  setup,
  guesses: [],
  done: false,
});

export function guess(s: FirstSharesState, g: Move): FirstSharesState {
  if (s.done) return s;
  const guesses = [...s.guesses, g];
  return { ...s, guesses, done: guesses.length >= s.setup.rounds.length };
}

export interface FirstSharesResult {
  start: number;
  end: number;
  shares: number;
  capStart: number;
  capEnd: number;
  /** Variación del precio en % (2 decimales). */
  pct: number;
  freeFloat: number;
  /** Capitalización de las acciones que cotizan libremente, al final. */
  floatCap: number;
  stake: number;
  stakeStart: number;
  stakeEnd: number;
  hits: number;
  /** 0–1 corregida por azar: acertar 1 de cada 3 jugando al azar da 0. */
  score: number;
}

export function firstSharesResult(s: FirstSharesState): FirstSharesResult {
  const { setup } = s;
  const path = pricePath(setup);
  const start = path[0]!;
  const end = path.at(-1)!;
  const capEnd = r2(end * SHARES);
  const hits = setup.rounds.filter((r, i) => s.guesses[i] && isHit(r, s.guesses[i])).length;
  const chance = setup.rounds.length / 3;
  const score = Math.max(0, Math.min(1, (hits - chance) / (setup.rounds.length - chance)));
  return {
    start,
    end,
    shares: SHARES,
    capStart: r2(start * SHARES),
    capEnd,
    pct: r2((end / start - 1) * 100),
    freeFloat: setup.freeFloat,
    floatCap: r2((capEnd * setup.freeFloat) / 100),
    stake: STAKE,
    stakeStart: r2(start * STAKE),
    stakeEnd: r2(end * STAKE),
    hits,
    score: Math.round(score * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}, en snake_case). */
export function firstSharesValues(r: FirstSharesResult): Record<string, number> {
  return {
    start: r.start,
    end: r.end,
    shares: r.shares,
    cap_start: r.capStart,
    cap_end: r.capEnd,
    pct: r.pct,
    free_float: r.freeFloat,
    float_cap: r.floatCap,
    stake: r.stake,
    stake_start: r.stakeStart,
    stake_end: r.stakeEnd,
    hits: r.hits,
  };
}
