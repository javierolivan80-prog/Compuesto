import { addDays } from './days';
import { normalizeEvents, type Summary } from './projections';
import type { AppEvent } from './events';
import { dayKey } from './days';

/* Estadísticas personales locales (CLAUDE.md §11), calculadas desde los eventos. */

export interface PersonalStats {
  totalXp: number;
  streak: number;
  longestStreak: number;
  /** Días con XP > 0 en total */
  activeDays: number;
  /** Días con XP > 0 en los últimos 7 (incluido hoy) */
  activeDaysLast7: number;
  lessonsCompleted: number;
  exercisesAnswered: number;
  /** 0–1; null si aún no hay respuestas */
  accuracy: number | null;
  /** Ejercicios con más fallos, de más a menos (cola de revisión del contenido) */
  mostFailed: { exerciseId: string; fails: number; attempts: number }[];
  /** Lecciones empezadas y nunca completadas */
  abandonedLessons: number;
}

export function personalStats(
  events: readonly AppEvent[],
  summary: Summary,
  today: string,
): PersonalStats {
  const norm = normalizeEvents(events);
  let answered = 0;
  let correct = 0;
  const per = new Map<string, { fails: number; attempts: number }>();
  for (const e of norm) {
    if (e.type !== 'exercise_answered') continue;
    // los tests de salto (xp 0 y lessonId "salto-…") cuentan como respuestas pero no entran en "más fallados"
    answered++;
    if (e.payload.correct) correct++;
    const row = per.get(e.payload.exerciseId) ?? { fails: 0, attempts: 0 };
    row.attempts++;
    if (!e.payload.correct) row.fails++;
    per.set(e.payload.exerciseId, row);
  }
  const days = Object.keys(summary.xp.byDay);
  const last7 = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)));
  const lessons = Object.values(summary.progress.lessons);
  return {
    totalXp: summary.xp.total,
    streak: summary.streak.current,
    longestStreak: summary.streak.longest,
    activeDays: days.length,
    activeDaysLast7: days.filter((d) => last7.has(d)).length,
    lessonsCompleted: lessons.filter((l) => l.status === 'completed').length,
    exercisesAnswered: answered,
    accuracy: answered ? correct / answered : null,
    mostFailed: [...per.entries()]
      .filter(([, v]) => v.fails > 0)
      .map(([exerciseId, v]) => ({ exerciseId, ...v }))
      .sort((a, b) => b.fails - a.fails || a.exerciseId.localeCompare(b.exerciseId))
      .slice(0, 5),
    abandonedLessons: lessons.filter((l) => l.status === 'started').length,
  };
}

/** CSV exportable (CLAUDE.md §11): una fila por día activo + resumen. */
export function statsToCsv(stats: PersonalStats, byDay: Record<string, number>): string {
  const rows = [
    ['dia', 'xp'],
    ...Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, xp]) => [d, String(xp)]),
  ];
  const summary = [
    ['metrica', 'valor'],
    ['xp_total', String(stats.totalXp)],
    ['racha_actual', String(stats.streak)],
    ['racha_maxima', String(stats.longestStreak)],
    ['dias_activos', String(stats.activeDays)],
    ['dias_activos_ultimos_7', String(stats.activeDaysLast7)],
    ['lecciones_completadas', String(stats.lessonsCompleted)],
    ['ejercicios_respondidos', String(stats.exercisesAnswered)],
    ['precision', stats.accuracy === null ? '' : stats.accuracy.toFixed(4)],
    ['lecciones_abandonadas', String(stats.abandonedLessons)],
  ];
  return [...summary, [], ...rows].map((r) => r.join(',')).join('\n') + '\n';
}

export const todayKey = (now: Date, tz?: string) => dayKey(now, tz);
