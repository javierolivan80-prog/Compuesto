import { addDays, dayKey } from './days';
import type { AppEvent, BlockSpec } from './events';
import type { GameId } from './games/common';
import { normalizeEvents } from './projections';

/*
 * Sesión "Abrir mercado" (CLAUDE.md §7, §8b): el orquestador monta ~20 minutos según el tiempo elegido y el
 * estado de la persona. Puro y testeado; los bloques son especificaciones serializables que se guardan en el
 * evento `session_started`, así una sesión interrumpida se puede reanudar tal cual.
 */

/** Minutos estimados por unidad de cada bloque. */
export const COST = {
  briefing: 0.5,
  cierre: 0.5,
  perDueCard: 0.4,
  perReviewExercise: 0.5,
  perRetoExercise: 0.6,
  /** Una partida de minijuego dura ~2–3 min. */
  game: 2.5,
} as const;

/** Tamaño del Encargo del jefe (reto semanal más largo). */
export const WEEKLY_EXERCISES = 8;
export const SESSION_MINUTES = [5, 10, 15, 20] as const;

export interface NextLesson {
  id: string;
  minutes: number;
}

export interface PlanInput {
  minutes: number;
  /** Tarjetas de repaso que tocan hoy (ya acotadas por el motor SRS). */
  dueCount: number;
  /** Próximas lecciones sin completar, en orden del Camino. */
  nextLessons: readonly NextLesson[];
  /** Ejercicios con historial que sirven para repaso y reto. */
  reviewable: number;
  /** ¿Toca el Encargo del jefe esta semana? */
  weeklyBoss: boolean;
  /** Minijuego de hoy (solo con conceptos vistos); si no hay, el bloque se sustituye por repaso. */
  gameId?: GameId | null;
}

export interface SessionPlan {
  blocks: BlockSpec[];
  /** Minutos estimados totales. */
  estimatedMinutes: number;
}

export function estimateMinutes(
  blocks: readonly BlockSpec[],
  lessonMinutes: (id: string) => number,
): number {
  let m = 0;
  for (const b of blocks) {
    if (b.kind === 'briefing') m += COST.briefing;
    else if (b.kind === 'cierre') m += COST.cierre;
    else if (b.kind === 'due') m += b.cards * COST.perDueCard;
    else if (b.kind === 'lesson') m += lessonMinutes(b.lessonId);
    else if (b.kind === 'game') m += COST.game;
    else if (b.kind === 'review') m += b.exercises * COST.perReviewExercise;
    else m += b.exercises * COST.perRetoExercise;
  }
  return Math.round(m * 10) / 10;
}

/**
 * Orden fijo: Briefing, Due diligence, Lección 1, minijuego (o repaso si no hay), Lección 2, Reto del día
 * (o Encargo del jefe) y Cierre. Se incluye cada bloque solo si cabe en el tiempo elegido; lo que sobra se
 * reparte en repaso/reto para no dejar huecos, y una sesión nunca queda sin nada sustancial si hay contenido.
 */
export function planSession(input: PlanInput): SessionPlan {
  const total = Math.max(1, input.minutes);
  let left = total - COST.briefing - COST.cierre;
  const lessons = input.nextLessons;
  const blocks: BlockSpec[] = [{ kind: 'briefing' }];
  const lessonMin = new Map(lessons.map((l) => [l.id, l.minutes]));

  // 1) Due diligence: hasta ~45 % del tiempo y 15 tarjetas
  if (input.dueCount > 0 && left >= 1.2) {
    const cap = Math.min(input.dueCount, 15);
    const byTime = Math.floor(Math.min(left * 0.45, 6) / COST.perDueCard);
    const cards = Math.max(1, Math.min(cap, Math.max(byTime, Math.min(cap, 3))));
    blocks.push({ kind: 'due', cards });
    left -= cards * COST.perDueCard;
  }

  // 2) Lección 1
  const first = lessons[0];
  let usedLessons = 0;
  if (first && first.minutes <= left + 0.5) {
    blocks.push({ kind: 'lesson', lessonId: first.id });
    left -= first.minutes;
    usedLessons++;
  }

  // 3) Minijuego de hoy; si no hay ninguno disponible, repaso en su lugar (se monta con lo que haya en ese momento)
  const reviewAvailable = input.reviewable >= 3 || usedLessons > 0;
  if (input.gameId && left >= COST.game) {
    blocks.push({ kind: 'game', gameId: input.gameId });
    left -= COST.game;
  } else if (reviewAvailable && left >= 1.5) {
    const n = Math.max(3, Math.min(6, Math.floor(left / COST.perReviewExercise)));
    blocks.push({ kind: 'review', exercises: n });
    left -= n * COST.perReviewExercise;
  }

  // 4) Lección 2
  const second = lessons[1];
  if (second && usedLessons === 1 && second.minutes <= left + 0.5) {
    blocks.push({ kind: 'lesson', lessonId: second.id });
    left -= second.minutes;
    usedLessons++;
  }

  // 5) Reto del día / Encargo del jefe
  const retoOk = input.reviewable >= 3 || usedLessons > 0;
  if (retoOk && left >= 1.2) {
    const weekly = input.weeklyBoss && left >= WEEKLY_EXERCISES * COST.perRetoExercise - 0.5;
    const n = weekly
      ? WEEKLY_EXERCISES
      : Math.max(2, Math.min(5, Math.floor(left / COST.perRetoExercise)));
    blocks.push({ kind: 'reto', exercises: n, weekly });
    left -= n * COST.perRetoExercise;
  }

  // 6) Sin huecos: lo que sobre se reparte en repaso y después en reto (máx. 15 cada uno)
  if (left >= 1.2 && (input.reviewable >= 3 || usedLessons > 0)) {
    const ri = blocks.findIndex((b) => b.kind === 'review');
    if (ri >= 0) {
      const b = blocks[ri] as Extract<BlockSpec, { kind: 'review' }>;
      const extra = Math.min(15 - b.exercises, Math.floor(left / COST.perReviewExercise));
      if (extra > 0) {
        blocks[ri] = { kind: 'review', exercises: b.exercises + extra };
        left -= extra * COST.perReviewExercise;
      }
    } else if (left >= 1.5) {
      const n = Math.min(15, Math.max(3, Math.floor(left / COST.perReviewExercise)));
      // el repaso va antes del reto, no después
      const at = blocks.findIndex((b) => b.kind === 'reto');
      blocks.splice(at >= 0 ? at : blocks.length, 0, { kind: 'review', exercises: n });
      left -= n * COST.perReviewExercise;
    }
    const ti = blocks.findIndex((b) => b.kind === 'reto' && !b.weekly);
    if (ti >= 0 && left >= COST.perRetoExercise) {
      const b = blocks[ti] as Extract<BlockSpec, { kind: 'reto' }>;
      const extra = Math.min(15 - b.exercises, Math.floor(left / COST.perRetoExercise));
      if (extra > 0) {
        blocks[ti] = { kind: 'reto', exercises: b.exercises + extra, weekly: false };
      }
    }
  }

  // nunca una sesión vacía si hay algo que estudiar: una lección aunque no quepa del todo
  const substantive = blocks.some((b) => b.kind !== 'briefing');
  if (!substantive && first) blocks.push({ kind: 'lesson', lessonId: first.id });

  blocks.push({ kind: 'cierre' });
  const estimated = estimateMinutes(blocks, (id) => lessonMin.get(id) ?? 4);
  return { blocks, estimatedMinutes: estimated };
}

/* ---------- Estado de la sesión a partir de eventos ---------- */

export interface ActiveSession {
  sessionId: string;
  day: string;
  minutes: number;
  blocks: BlockSpec[];
  completed: number[];
  /** Primer bloque sin completar; igual a blocks.length si ya están todos. */
  nextIndex: number;
  startedAt: string;
}

/** Última sesión del día sin cerrar (`session_completed`), con los bloques ya hechos; null si no hay. */
export function activeSession(events: readonly AppEvent[], today: string): ActiveSession | null {
  const evs = normalizeEvents(events);
  const closed = new Set<string>();
  for (const e of evs) if (e.type === 'session_completed') closed.add(e.payload.sessionId);
  let found: ActiveSession | null = null;
  for (const e of evs) {
    if (e.type !== 'session_started' || e.payload.day !== today || closed.has(e.payload.sessionId))
      continue;
    found = {
      sessionId: e.payload.sessionId,
      day: e.payload.day,
      minutes: e.payload.minutes,
      blocks: e.payload.blocks,
      completed: [],
      nextIndex: 0,
      startedAt: e.createdAt,
    };
  }
  if (!found) return null;
  const done = new Set<number>();
  for (const e of evs)
    if (e.type === 'session_block_completed' && e.payload.sessionId === found.sessionId)
      done.add(e.payload.index);
  found.completed = [...done].sort((a, b) => a - b);
  let i = 0;
  while (done.has(i)) i++;
  found.nextIndex = i;
  return found;
}

/** Sesiones cerradas en un día. */
export function sessionsCompletedOn(events: readonly AppEvent[], day: string, tz?: string): number {
  return events.filter(
    (e) => e.type === 'session_completed' && dayKey(e.createdAt, tz ?? e.tz) === day,
  ).length;
}

/** Lunes de la semana (clave de día) que contiene `day`. */
export function weekStart(day: string): string {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(day, -((dow + 6) % 7));
}

/** ¿Falta el Encargo del jefe de esta semana? Se cuenta como hecho si una sesión de la semana lo incluyó y se cerró. */
export function weeklyBossAvailable(events: readonly AppEvent[], today: string): boolean {
  const start = weekStart(today);
  const closed = new Set<string>();
  for (const e of events) if (e.type === 'session_completed') closed.add(e.payload.sessionId);
  for (const e of events) {
    if (e.type !== 'session_started' || !closed.has(e.payload.sessionId)) continue;
    if (e.payload.day >= start && e.payload.day <= addDays(start, 6))
      if (e.payload.blocks.some((b) => b.kind === 'reto' && b.weekly)) return false;
  }
  return true;
}
