/* Cola de ejercicios de una lección: los fallos vuelven al final (una vez). Pura y testeada. */

export const XP_FIRST_TRY = 10;
export const XP_RETRY = 5;
export const XP_COMPLETION_GOOD = 20;
export const XP_COMPLETION_BASE = 10;
export const GOOD_ACCURACY = 0.8;

export interface SessionState {
  /** Ids pendientes, el primero es el actual. */
  queue: string[];
  total: number;
  /** Ids ya resueltos correctamente. */
  done: string[];
  /** Ids fallados al menos una vez (ya reencolados). */
  failedOnce: string[];
  /** XP ganado hasta ahora (sin la bonificación de cierre). */
  xp: number;
}

export function startSession(ids: readonly string[]): SessionState {
  return { queue: [...ids], total: ids.length, done: [], failedOnce: [], xp: 0 };
}

export const currentId = (s: SessionState): string | undefined => s.queue[0];
export const isDone = (s: SessionState): boolean => s.queue.length === 0;

/** XP de una respuesta: 10 al acertar a la primera, 5 al acertar tras un fallo, 0 al fallar. */
export function xpForAnswer(correct: boolean, isRetry: boolean): number {
  return correct ? (isRetry ? XP_RETRY : XP_FIRST_TRY) : 0;
}

/**
 * Registra la respuesta al ejercicio actual. Acierto: sale de la cola. Fallo: pasa al final
 * (solo la primera vez; si vuelve a fallar en el repaso, también sale para no bloquear la lección).
 */
export function answer(
  s: SessionState,
  correct: boolean,
): { state: SessionState; xp: number; isRetry: boolean } {
  const id = currentId(s);
  if (id === undefined) throw new Error('La lección ya terminó');
  const isRetry = s.failedOnce.includes(id);
  const xp = xpForAnswer(correct, isRetry);
  const rest = s.queue.slice(1);
  if (correct || isRetry) {
    return {
      state: { ...s, queue: rest, done: correct ? [...s.done, id] : s.done, xp: s.xp + xp },
      xp,
      isRetry,
    };
  }
  return {
    state: { ...s, queue: [...rest, id], failedOnce: [...s.failedOnce, id], xp: s.xp },
    xp,
    isRetry,
  };
}

/** Precisión = aciertos a la primera / total (0–1). */
export function accuracy(s: SessionState): number {
  return s.total === 0 ? 0 : (s.total - s.failedOnce.length) / s.total;
}

export function completionXp(acc: number): number {
  return acc >= GOOD_ACCURACY ? XP_COMPLETION_GOOD : XP_COMPLETION_BASE;
}
