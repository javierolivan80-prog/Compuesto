/* Lógica pura del kit de game feel (docs/JUEGOS.md §2): nota de crédito y combo. */

export const RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'] as const;
export type Rating = (typeof RATINGS)[number];

/** Umbrales mínimos (sobre una puntuación normalizada 0–1) de cada nota. */
export const RATING_THRESHOLDS: Record<Rating, number> = {
  AAA: 0.95,
  AA: 0.85,
  A: 0.72,
  BBB: 0.58,
  BB: 0.42,
  B: 0,
};

export function ratingFor(score: number, thresholds = RATING_THRESHOLDS): Rating {
  const s = Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
  return RATINGS.find((r) => s >= thresholds[r]) ?? 'B';
}

/** Rating por orden: ¿la nota `a` es al menos tan buena como `b`? */
export const ratingAtLeast = (a: Rating, b: Rating): boolean =>
  RATINGS.indexOf(a) <= RATINGS.indexOf(b);

export interface ComboState {
  streak: number;
  best: number;
  /** Multiplicador vigente: 1, 2, 3 o 4. */
  multiplier: 1 | 2 | 3 | 4;
}

export const initialCombo = (): ComboState => ({ streak: 0, best: 0, multiplier: 1 });

export function multiplierFor(streak: number): ComboState['multiplier'] {
  if (streak >= 7) return 4;
  if (streak >= 4) return 3;
  if (streak >= 2) return 2;
  return 1;
}

export interface ComboResult {
  state: ComboState;
  /** El multiplicador subió con este acierto (dispara el pulso del medidor). */
  raised: boolean;
  /** Se rompió un combo que valía más de ×1 (dispara el vaciado y el tic grave). */
  broken: boolean;
}

export function comboStep(s: ComboState, hit: boolean): ComboResult {
  if (!hit) {
    return {
      state: { streak: 0, best: s.best, multiplier: 1 },
      raised: false,
      broken: s.multiplier > 1,
    };
  }
  const streak = s.streak + 1;
  const multiplier = multiplierFor(streak);
  return {
    state: { streak, best: Math.max(s.best, streak), multiplier },
    raised: multiplier > s.multiplier,
    broken: false,
  };
}

/** Puntos de un acierto: base × multiplicador vigente tras el acierto. */
export const comboPoints = (base: number, s: ComboState): number => base * s.multiplier;

/** XP de una partida según la nota: poco por jugar al azar (B), más por dominar el concepto. */
export const GAME_XP: Record<Rating, number> = { AAA: 40, AA: 30, A: 25, BBB: 20, BB: 10, B: 5 };
/** Solo las primeras partidas del día dan XP, para que los juegos no sean una granja. */
export const GAME_XP_PLAYS_PER_DAY = 3;
export const gameXp = (rating: Rating, playsToday: number): number =>
  playsToday < GAME_XP_PLAYS_PER_DAY ? GAME_XP[rating] : 0;
