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
  /** Sesiones «Abrir mercado» cerradas */
  sessionsCompleted: number;
  /** Minutos reales medios por sesión cerrada (tope de 60 por sesión para ignorar pestañas olvidadas); null si no hay */
  avgSessionMinutes: number | null;
  /** Conceptos con más fallos relativos (≥ 3 intentos), de peor a mejor precisión */
  weakConcepts: { conceptId: string; accuracy: number; attempts: number }[];
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
  const perConcept = new Map<string, { ok: number; attempts: number }>();
  const started = new Map<string, number>();
  const sessionMs: number[] = [];
  for (const e of norm) {
    if (e.type === 'session_started') started.set(e.payload.sessionId, Date.parse(e.createdAt));
    if (e.type === 'session_completed') {
      const t0 = started.get(e.payload.sessionId);
      if (t0 !== undefined)
        sessionMs.push(Math.min(60 * 60_000, Math.max(0, Date.parse(e.createdAt) - t0)));
    }
    if (e.type !== 'exercise_answered') continue;
    for (const c of e.payload.conceptIds) {
      const r = perConcept.get(c) ?? { ok: 0, attempts: 0 };
      r.attempts++;
      if (e.payload.correct) r.ok++;
      perConcept.set(c, r);
    }
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
    sessionsCompleted: sessionMs.length,
    avgSessionMinutes: sessionMs.length
      ? Math.round((sessionMs.reduce((a, b) => a + b, 0) / sessionMs.length / 60_000) * 10) / 10
      : null,
    weakConcepts: [...perConcept.entries()]
      .filter(([, v]) => v.attempts >= 3 && v.ok < v.attempts)
      .map(([conceptId, v]) => ({ conceptId, accuracy: v.ok / v.attempts, attempts: v.attempts }))
      .sort((a, b) => a.accuracy - b.accuracy || a.conceptId.localeCompare(b.conceptId))
      .slice(0, 5),
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
    ['sesiones_completadas', String(stats.sessionsCompleted)],
    ['minutos_por_sesion', stats.avgSessionMinutes === null ? '' : String(stats.avgSessionMinutes)],
  ];
  return [...summary, [], ...rows].map((r) => r.join(',')).join('\n') + '\n';
}

export const todayKey = (now: Date, tz?: string) => dayKey(now, tz);
