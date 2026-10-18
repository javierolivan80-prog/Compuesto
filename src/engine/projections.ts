import { addDays, dayKey, daysBetween } from './days';
import { DEFAULT_TZ, type AppEvent } from './events';
import { floorOfLevel } from './floors';

/* Proyecciones puras: el estado se recalcula siempre desde los eventos (CLAUDE.md §3b). */

export const RANKS = [
  { name: 'Becario', minXp: 0 },
  { name: 'Analista Junior', minXp: 500 },
  { name: 'Analista', minXp: 1500 },
  { name: 'Asociado', minXp: 3500 },
  { name: 'VP', minXp: 7000 },
  { name: 'Director', minXp: 12000 },
  { name: 'Director Sénior', minXp: 19000 },
  { name: 'Managing Director', minXp: 28000 },
  { name: 'Partner', minXp: 40000 },
  { name: 'Leyenda', minXp: 55000 },
] as const;

export const MAX_FREEZES = 2;
/** Cada 7 días de racha se gana un congelador (máx. MAX_FREEZES). */
export const FREEZE_EVERY = 7;
export const DEFAULT_DAILY_GOAL_XP = 60;

/** Orden estable: por fecha, y a igualdad por id. Elimina duplicados por id (idempotencia). */
export function normalizeEvents(events: readonly AppEvent[]): AppEvent[] {
  const byId = new Map<string, AppEvent>();
  for (const e of events) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => {
    const t = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return t !== 0 ? t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

const eventXp = (e: AppEvent): number =>
  e.type === 'exercise_answered' ||
  e.type === 'lesson_completed' ||
  e.type === 'game_played' ||
  e.type === 'mesa_day_closed'
    ? e.payload.xp
    : 0;

export interface XpProjection {
  total: number;
  byDay: Record<string, number>;
}

export function projectXp(events: readonly AppEvent[]): XpProjection {
  const byDay: Record<string, number> = {};
  let total = 0;
  for (const e of normalizeEvents(events)) {
    const xp = eventXp(e);
    if (xp <= 0) continue;
    total += xp;
    const d = dayKey(e.createdAt, e.tz);
    byDay[d] = (byDay[d] ?? 0) + xp;
  }
  return { total, byDay };
}

export interface StreakProjection {
  current: number;
  longest: number;
  freezes: number;
  /** Días que un congelador salvó. */
  frozenDays: string[];
  lastActiveDay: string | null;
  /** Hoy aún no hay actividad: la racha sigue viva pero hay que jugar antes de medianoche. */
  atRisk: boolean;
}

/**
 * Racha en días naturales de cada evento (zona del evento). Día activo = con XP > 0.
 * Un día sin actividad consume un congelador si hay; si no, la racha vuelve a 0.
 * Hoy no cuenta como fallo hasta que termina. `today` es una clave yyyy-mm-dd.
 */
export function projectStreak(xp: XpProjection, today: string): StreakProjection {
  const active = Object.keys(xp.byDay).sort();
  const first = active[0];
  const empty: StreakProjection = {
    current: 0,
    longest: 0,
    freezes: 0,
    frozenDays: [],
    lastActiveDay: null,
    atRisk: false,
  };
  if (!first) return empty;

  const activeSet = new Set(active);
  let current = 0;
  let longest = 0;
  let freezes = 0;
  const frozenDays: string[] = [];
  let lastActiveDay: string | null = null;

  const end = daysBetween(first, today) >= 0 ? today : active[active.length - 1]!;
  for (let d = first; daysBetween(d, end) >= 0; d = addDays(d, 1)) {
    if (activeSet.has(d)) {
      current += 1;
      lastActiveDay = d;
      if (current % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
      longest = Math.max(longest, current);
    } else if (d === today) {
      break; // el día de hoy no ha terminado
    } else if (freezes > 0 && current > 0) {
      freezes -= 1;
      frozenDays.push(d);
    } else {
      current = 0;
    }
  }
  return {
    current,
    longest,
    freezes,
    frozenDays,
    lastActiveDay,
    atRisk: current > 0 && !activeSet.has(today),
  };
}

export interface LessonProgress {
  lessonId: string;
  unitId?: string;
  level?: number;
  status: 'started' | 'completed';
  attempts: number;
  completions: number;
  bestAccuracy: number;
  answered: number;
  correct: number;
  lastActivity: string;
}

export interface ProgressProjection {
  lessons: Record<string, LessonProgress>;
  skippedUnits: string[];
}

export function projectProgress(events: readonly AppEvent[]): ProgressProjection {
  const lessons: Record<string, LessonProgress> = {};
  const skipped = new Set<string>();
  const get = (lessonId: string, e: AppEvent): LessonProgress =>
    (lessons[lessonId] ??= {
      lessonId,
      status: 'started',
      attempts: 0,
      completions: 0,
      bestAccuracy: 0,
      answered: 0,
      correct: 0,
      lastActivity: e.createdAt,
    });

  for (const e of normalizeEvents(events)) {
    switch (e.type) {
      case 'lesson_started': {
        const l = get(e.payload.lessonId, e);
        l.attempts += 1;
        l.unitId = e.payload.unitId ?? l.unitId;
        l.level = e.payload.level ?? l.level;
        l.lastActivity = e.createdAt;
        break;
      }
      case 'exercise_answered': {
        const l = get(e.payload.lessonId, e);
        l.answered += 1;
        if (e.payload.correct) l.correct += 1;
        l.lastActivity = e.createdAt;
        break;
      }
      case 'lesson_completed': {
        const l = get(e.payload.lessonId, e);
        l.status = 'completed';
        l.completions += 1;
        l.bestAccuracy = Math.max(l.bestAccuracy, e.payload.accuracy);
        l.unitId = e.payload.unitId ?? l.unitId;
        l.level = e.payload.level ?? l.level;
        l.lastActivity = e.createdAt;
        break;
      }
      case 'unit_skipped':
        skipped.add(e.payload.unitId);
        break;
      default:
        break;
    }
  }
  return { lessons, skippedUnits: [...skipped].sort() };
}

export interface RankProjection {
  rankIndex: number;
  rank: string;
  nextRank: string | null;
  xpToNext: number | null;
  /** Planta: la más alta con alguna lección completada (0 si ninguna; la Base no cuenta). */
  floor: number;
}

export function projectRank(totalXp: number, progress: ProgressProjection): RankProjection {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (totalXp >= r.minXp) idx = i;
  });
  const next = RANKS[idx + 1];
  const floor = Object.values(progress.lessons).reduce(
    (m, l) =>
      l.status === 'completed' && l.level !== undefined
        ? Math.max(m, floorOfLevel(l.level) ?? 0)
        : m,
    0,
  );
  return {
    rankIndex: idx,
    rank: RANKS[idx]!.name,
    nextRank: next?.name ?? null,
    xpToNext: next ? next.minXp - totalXp : null,
    floor,
  };
}

export interface DailyGoal {
  day: string;
  xp: number;
  goal: number;
  reached: boolean;
}

export function projectDailyGoal(xp: XpProjection, today: string, goal: number): DailyGoal {
  const got = xp.byDay[today] ?? 0;
  return { day: today, xp: got, goal, reached: got >= goal };
}

/**
 * Conceptos "vistos" (para el repaso espaciado): los de los ejercicios respondidos y los de las unidades
 * saltadas con el test de salto (TEMARIO §5: "sus conceptos entran en el repaso como vistos").
 * `unitConcepts` viene del curriculum: unitId → conceptos.
 */
export function projectSeenConcepts(
  events: readonly AppEvent[],
  unitConcepts: Record<string, string[]>,
): string[] {
  const seen = new Set<string>();
  for (const e of normalizeEvents(events)) {
    if (e.type === 'exercise_answered') for (const c of e.payload.conceptIds) seen.add(c);
    if (e.type === 'unit_skipped')
      for (const c of unitConcepts[e.payload.unitId] ?? []) seen.add(c);
  }
  return [...seen].sort();
}

export type Settings = Record<string, string | number | boolean | null>;

/** Último valor de cada ajuste (gana el evento más reciente). */
export function projectSettings(events: readonly AppEvent[]): Settings {
  const out: Settings = {};
  for (const e of normalizeEvents(events))
    if (e.type === 'settings_changed') out[e.payload.key] = e.payload.value;
  return out;
}

export interface Summary {
  asOfDay: string;
  xp: XpProjection;
  streak: StreakProjection;
  progress: ProgressProjection;
  rank: RankProjection;
  dailyGoal: DailyGoal;
  settings: Settings;
}

export function goalFromSettings(settings: Settings): number {
  const g = settings['dailyGoalXp'];
  return typeof g === 'number' && g > 0 ? g : DEFAULT_DAILY_GOAL_XP;
}

/** Todas las proyecciones a la vez, referidas al día `today` (clave en la zona del dispositivo). */
export function projectAll(
  events: readonly AppEvent[],
  today: string = dayKey(new Date(), DEFAULT_TZ),
): Summary {
  const norm = normalizeEvents(events);
  const xp = projectXp(norm);
  const progress = projectProgress(norm);
  const settings = projectSettings(norm);
  return {
    asOfDay: today,
    xp,
    streak: projectStreak(xp, today),
    progress,
    rank: projectRank(xp.total, progress),
    dailyGoal: projectDailyGoal(xp, today, goalFromSettings(settings)),
    settings,
  };
}
