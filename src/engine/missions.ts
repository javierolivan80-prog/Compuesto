import { dayKey } from './days';
import type { AppEvent } from './events';
import { seededShuffle } from './grading';

/* Misiones diarias (CLAUDE.md §7): 3 por día, elegidas de forma determinista por el día y calculadas desde eventos. */

export interface Mission {
  id: string;
  title: string;
  target: number;
  progress: number;
  done: boolean;
}

interface Def {
  id: string;
  title: (goal: number) => string;
  target: (goal: number) => number;
  progress: (todays: readonly AppEvent[], goal: number) => number;
}

const answers = (evs: readonly AppEvent[]) =>
  evs.flatMap((e) => (e.type === 'exercise_answered' ? [e] : []));

const POOL: Def[] = [
  {
    id: 'leccion',
    title: () => 'Completa una lección',
    target: () => 1,
    progress: (evs) => evs.filter((e) => e.type === 'lesson_completed').length,
  },
  {
    id: 'diez',
    title: () => 'Responde 10 ejercicios',
    target: () => 10,
    progress: (evs) => answers(evs).length,
  },
  {
    id: 'repaso',
    title: () => 'Haz un repaso de 5 ejercicios',
    target: () => 5,
    progress: (evs) => answers(evs).filter((e) => e.payload.source === 'review').length,
  },
  {
    id: 'racha-aciertos',
    title: () => 'Encadena 6 aciertos seguidos',
    target: () => 6,
    progress: (evs) => {
      let best = 0;
      let run = 0;
      for (const e of answers(evs)) {
        run = e.payload.correct ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return best;
    },
  },
  {
    id: 'xp',
    title: (goal) => `Alcanza tu objetivo de ${goal} XP`,
    target: (goal) => goal,
    progress: (evs) =>
      evs.reduce(
        (s, e) =>
          s + (e.type === 'exercise_answered' || e.type === 'lesson_completed' ? e.payload.xp : 0),
        0,
      ),
  },
  {
    id: 'sesion',
    title: () => 'Completa una sesión de Abrir mercado',
    target: () => 1,
    progress: (evs) => evs.filter((e) => e.type === 'session_completed').length,
  },
];

/** Las 3 misiones del día con su progreso. `goalXp` es el objetivo diario de XP elegido. */
export function dailyMissions(
  events: readonly AppEvent[],
  today: string,
  goalXp: number,
): Mission[] {
  const todays = events.filter((e) => dayKey(e.createdAt, e.tz) === today);
  return seededShuffle(POOL, `misiones:${today}`)
    .slice(0, 3)
    .map((d) => {
      const target = d.target(goalXp);
      const progress = Math.min(target, d.progress(todays, goalXp));
      return { id: d.id, title: d.title(goalXp), target, progress, done: progress >= target };
    });
}
