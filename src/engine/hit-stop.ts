/* Hit-stop: micro pausa de 40–60 ms en aciertos importantes. Basado en tiempo (no en temporizadores que se puedan
   perder), así que siempre se reanuda. El juego pregunta `isFrozen(now)` en cada fotograma. */

export const HIT_STOP_MIN = 40;
export const HIT_STOP_MAX = 60;

export interface HitStop {
  freeze: (now: number, ms?: number) => void;
  isFrozen: (now: number) => boolean;
  /** Tiempo congelado acumulado hasta `now` (para que la simulación descuente la pausa). */
  frozenTotal: (now: number) => number;
}

export function createHitStop(): HitStop {
  let until = 0;
  let from = 0;
  let total = 0;
  return {
    freeze(now, ms = HIT_STOP_MAX) {
      const d = Math.min(HIT_STOP_MAX, Math.max(HIT_STOP_MIN, ms));
      // se cierra lo congelado hasta ahora y se abre una congelación nueva (no se acumula más de HIT_STOP_MAX desde ahora)
      total += Math.max(0, Math.min(now, until) - from);
      from = now;
      until = now + d;
    },
    isFrozen: (now) => now < until,
    frozenTotal: (now) => total + Math.max(0, Math.min(now, until) - from),
  };
}
