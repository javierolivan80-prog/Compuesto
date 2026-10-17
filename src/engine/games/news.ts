import { gamesData } from '../../content/games-data';
import { seededShuffle } from '../grading';
import { marketPath } from '../market';
import { addTally, emptyTally, hashSeed, makeResult, type GameResult } from './common';

/* ¿Sube o baja? (juego 4): un titular ficticio; predices la dirección, eliges el motivo y ves la vela formarse. */

export type Headline = (typeof gamesData.titulares)[number];
export const NEWS_ROUNDS = 8;
export const NEWS_MIN_POOL = 5;

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface NewsRound {
  headline: Headline;
  /** Orden en que se muestran los motivos: `motiveOrder[k]` = índice original del motivo en la posición k. */
  motiveOrder: number[];
  candle: Candle;
}

/** Titulares cuya información ya se ha visto (todos sus conceptos). */
export const availableHeadlines = (
  seen: ReadonlySet<string>,
  pool: readonly Headline[] = gamesData.titulares,
): Headline[] => pool.filter((h) => h.concepts.every((c) => seen.has(c)));

/** La vela sigue la dirección del titular: la formación sale de un camino de mercado con deriva a favor y poco ruido. */
export function candleFor(h: Headline, seed: number): Candle {
  const dir = h.direction === 'up' ? 1 : -1;
  const path = marketPath({
    seed,
    steps: 12,
    start: 100,
    regimes: [{ name: h.direction, mu: dir * 0.012, sigma: 0.004 }],
    jumpProb: 0,
    switchProb: 0,
  }).prices;
  return {
    open: path[0]!,
    close: path.at(-1)!,
    high: Math.max(...path),
    low: Math.min(...path),
  };
}

export function newsRounds(
  seed: number,
  pool: readonly Headline[],
  count = NEWS_ROUNDS,
): NewsRound[] {
  if (pool.length < NEWS_MIN_POOL)
    throw new Error(`hacen falta al menos ${NEWS_MIN_POOL} titulares`);
  const chosen = seededShuffle(pool, `${seed}:titulares`).slice(0, Math.min(count, pool.length));
  return chosen.map((h, i) => ({
    headline: h,
    motiveOrder: seededShuffle([0, 1, 2], `${seed}:${h.id}`),
    candle: candleFor(h, hashSeed(`${seed}:${i}:${h.id}`)),
  }));
}

export interface NewsAnswer {
  direction: 'up' | 'down' | null;
  /** Posición mostrada del motivo elegido (0–2). */
  motive: number | null;
}

export interface NewsRoundResult {
  directionOk: boolean;
  motiveOk: boolean;
  /** Acierto doble (dirección + motivo): dispara hit-stop y partículas. */
  double: boolean;
}

export function judgeRound(r: NewsRound, a: NewsAnswer): NewsRoundResult {
  const directionOk = a.direction === r.headline.direction;
  const motiveOk = a.motive !== null && r.motiveOrder[a.motive] === r.headline.answer;
  return { directionOk, motiveOk, double: directionOk && motiveOk };
}

export function playNews(
  seed: number,
  pool: readonly Headline[],
  answers: readonly (NewsAnswer | null)[],
): GameResult {
  const rounds = newsRounds(seed, pool);
  let tally = emptyTally();
  const missed = new Set<string>();
  let doubles = 0;
  rounds.forEach((r, i) => {
    const a = answers[i] ?? { direction: null, motive: null };
    const j = judgeRound(r, a);
    tally = addTally(tally, j.directionOk ? 1 : 0, 0.5);
    tally = addTally(tally, j.motiveOk ? 1 : 0, 1 / 3);
    if (j.double) doubles++;
    if (!j.directionOk || !j.motiveOk) for (const c of r.headline.concepts) missed.add(c);
  });
  return makeResult(
    'sube-o-baja',
    seed,
    tally,
    missed,
    'El precio se mueve cuando la información cambia lo que esperan compradores y vendedores; saber por qué importa más que adivinar hacia dónde.',
    `${doubles} de ${rounds.length} titulares con dirección y motivo acertados.`,
  );
}
