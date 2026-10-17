import { ratingFor, type Rating } from '../game-kit';

/* Piezas comunes de los juegos (docs/JUEGOS.md §3, §5). Puro y determinista. */

export const GAME_IDS = [
  'campana',
  'presupuesto',
  'mesa-ordenes',
  'sube-o-baja',
  'magia-compuesto',
  'impulsivo',
] as const;
export type GameId = (typeof GAME_IDS)[number];

/** Semilla numérica estable a partir de texto (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Partida del día: misma semilla para el mismo juego y día, en cualquier dispositivo (para comparar récords). */
export const dailySeed = (game: GameId, day: string): number => hashSeed(`${game}:${day}`);

/**
 * Acumulador de puntuación corregida por azar: `got` puntos obtenidos, `chance` los que daría jugar al azar y
 * `max` el máximo. La puntuación normalizada es 0 jugando al azar y 1 con todo perfecto, así que «responder al
 * azar» da siempre la nota B (JUEGOS.md §5).
 */
export interface Tally {
  got: number;
  chance: number;
  max: number;
}
export const emptyTally = (): Tally => ({ got: 0, chance: 0, max: 0 });
export const addTally = (t: Tally, got: number, chance: number, max = 1): Tally => ({
  got: t.got + got,
  chance: t.chance + chance,
  max: t.max + max,
});
export function tallyScore(t: Tally): number {
  const room = t.max - t.chance;
  if (t.max <= 0 || room <= 0) return 0;
  return Math.min(1, Math.max(0, (t.got - t.chance) / room));
}

export interface GameResult {
  game: GameId;
  seed: number;
  /** 0–1, corregida por azar. */
  score: number;
  rating: Rating;
  /** Conceptos en los que se falló (para enlazar al repaso). */
  missedConcepts: string[];
  /** Una frase de lo aprendido. */
  learned: string;
  /** Dato de la partida. */
  fact?: string;
}

export const makeResult = (
  game: GameId,
  seed: number,
  tally: Tally,
  missed: Iterable<string>,
  learned: string,
  fact?: string,
): GameResult => {
  const score = tallyScore(tally);
  return {
    game,
    seed,
    score,
    rating: ratingFor(score),
    missedConcepts: [...new Set(missed)],
    learned,
    ...(fact ? { fact } : {}),
  };
};
