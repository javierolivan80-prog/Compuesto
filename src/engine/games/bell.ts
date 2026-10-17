import { seededShuffle } from '../grading';
import { addTally, emptyTally, makeResult, type GameResult } from './common';

/* Campana de apertura (juego 1): tarjetas que caen; verdadero (derecha) o falso (izquierda) antes de que toquen el suelo. */

export interface BellCard {
  id: string;
  text: string;
  answer: boolean;
  concepts: string[];
}

export const BELL_CARDS = 24;
export const BELL_MIN_DECK = 8;

/** Mazo de la partida: determinista por semilla; si el banco es corto, se repiten ejercicios barajados de nuevo. */
export function bellSequence(
  deck: readonly BellCard[],
  seed: number,
  count = BELL_CARDS,
): BellCard[] {
  if (deck.length < BELL_MIN_DECK)
    throw new Error(`hacen falta al menos ${BELL_MIN_DECK} afirmaciones`);
  const out: BellCard[] = [];
  let round = 0;
  while (out.length < count) {
    for (const c of seededShuffle(deck, `${seed}:${round++}`)) {
      if (out.length >= count) break;
      // evita repetir la misma tarjeta dos veces seguidas al enlazar barajas
      if (out.at(-1)?.id === c.id) continue;
      out.push(c);
    }
  }
  return out;
}

/** Tiempo de caída (ms): 7 s al principio, baja con cada acierto seguido hasta 3,5 s. Con «sin tiempo» no hay caída. */
export const fallMs = (streak: number): number => Math.max(3500, 7000 - streak * 350);

export type BellAnswer = boolean | null;

/** `null` = la tarjeta tocó el suelo sin contestar. */
export function playBell(
  seed: number,
  cards: readonly BellCard[],
  answers: readonly BellAnswer[],
): GameResult {
  let tally = emptyTally();
  const missed: string[] = [];
  let hits = 0;
  cards.forEach((c, i) => {
    const ok = answers[i] === c.answer;
    tally = addTally(tally, ok ? 1 : 0, 0.5);
    if (ok) hits++;
    else missed.push(...c.concepts);
  });
  return makeResult(
    'campana',
    seed,
    tally,
    missed,
    'Decidir rápido solo sirve si lo que decides es correcto: repasar los conceptos dudosos te da velocidad con precisión.',
    `${hits} de ${cards.length} afirmaciones bien resueltas.`,
  );
}
