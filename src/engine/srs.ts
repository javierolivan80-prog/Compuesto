import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs';
import { dayKey } from './days';
import type { AppEvent } from './events';
import { normalizeEvents } from './projections';

/*
 * Repaso espaciado (CLAUDE.md §3b, §8). Todo es una proyección de los eventos `exercise_answered`:
 * una tarjeta por ejercicio, programada con FSRS (ts-fsrs, sin reimplementar el algoritmo).
 * Función pura: mismos eventos → mismas tarjetas, en cualquier orden de llegada.
 */

/** Dos respuestas al mismo ejercicio con menos de este intervalo son la misma sesión (reintento): solo cuenta la primera. */
export const SAME_ATTEMPT_MS = 20 * 60_000;
/** Máximo de tarjetas por sesión de repaso (CLAUDE.md §8). */
export const MAX_REVIEW_CARDS = 15;

const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: false, // determinista: reconstruir desde eventos da siempre lo mismo
    enable_short_term: false, // la app agenda por días, no por minutos
    learning_steps: [],
    relearning_steps: [],
  }),
);

export interface SrsCard {
  exerciseId: string;
  lessonId: string;
  conceptIds: string[];
  card: Card;
  /** Repasos contados (se descartan los reintentos de la misma sesión). */
  reviews: number;
  lapses: number;
  lastCorrect: boolean;
  lastReviewAt: string;
}

export interface Attempt {
  exerciseId: string;
  lessonId: string;
  conceptIds: string[];
  correct: boolean;
  at: string;
  timeMs: number;
}

/** Intentos "de verdad": quita los reintentos dentro de la misma sesión (misma tarjeta a menos de 20 min). */
export function firstAttempts(events: readonly AppEvent[]): Attempt[] {
  const last = new Map<string, number>();
  const out: Attempt[] = [];
  for (const e of normalizeEvents(events)) {
    if (e.type !== 'exercise_answered') continue;
    const t = Date.parse(e.createdAt);
    const prev = last.get(e.payload.exerciseId);
    last.set(e.payload.exerciseId, t);
    // en una lección, un reintento a menos de 20 min es la misma sesión; un repaso siempre cuenta
    if (e.payload.source === 'lesson' && prev !== undefined && t - prev < SAME_ATTEMPT_MS) continue;
    out.push({
      exerciseId: e.payload.exerciseId,
      lessonId: e.payload.lessonId,
      conceptIds: e.payload.conceptIds,
      correct: e.payload.correct,
      at: e.createdAt,
      timeMs: e.payload.timeMs,
    });
  }
  return out;
}

/** Tarjetas FSRS por ejercicio: acierto → Good, fallo → Again. */
export function projectCards(events: readonly AppEvent[]): Map<string, SrsCard> {
  const cards = new Map<string, SrsCard>();
  for (const a of firstAttempts(events)) {
    const when = new Date(a.at);
    const prev = cards.get(a.exerciseId);
    const base: Card = prev ? prev.card : createEmptyCard<Card>(when);
    const next = scheduler.next(base, when, a.correct ? Rating.Good : Rating.Again).card;
    cards.set(a.exerciseId, {
      exerciseId: a.exerciseId,
      lessonId: a.lessonId,
      conceptIds: a.conceptIds,
      card: next,
      reviews: (prev?.reviews ?? 0) + 1,
      lapses: next.lapses,
      lastCorrect: a.correct,
      lastReviewAt: a.at,
    });
  }
  return cards;
}

/** Día (clave en la zona del dispositivo) en que vence la tarjeta. */
export const dueDay = (c: SrsCard, tz?: string): string => dayKey(c.card.due, tz);

/** Ejercicio del contenido que se puede repasar (vivo, no retirado). */
export interface ExerciseRef {
  id: string;
  lessonId: string;
  unitId: string;
  concepts: string[];
}

export interface DueOptions {
  today: string;
  /** Ejercicios vivos del contenido; los que no estén aquí (retirados) se archivan. */
  catalog: readonly ExerciseRef[];
  tz?: string;
}

/** Tarjetas vencidas a fecha `today`, más atrasadas primero. Las de ejercicios retirados no cuentan. */
export function dueCards(cards: ReadonlyMap<string, SrsCard>, opts: DueOptions): SrsCard[] {
  const live = new Set(opts.catalog.map((e) => e.id));
  return [...cards.values()]
    .filter((c) => live.has(c.exerciseId) && dueDay(c, opts.tz) <= opts.today)
    .sort(
      (a, b) =>
        a.card.due.getTime() - b.card.due.getTime() || a.exerciseId.localeCompare(b.exerciseId),
    );
}

/** Tarjetas archivadas: existen en el historial pero su ejercicio ya no está en el contenido. */
export function archivedCards(
  cards: ReadonlyMap<string, SrsCard>,
  catalog: readonly ExerciseRef[],
): SrsCard[] {
  const live = new Set(catalog.map((e) => e.id));
  return [...cards.values()].filter((c) => !live.has(c.exerciseId));
}

/* ---------- Dominio por concepto ---------- */

export interface ConceptMastery {
  conceptId: string;
  attempts: number;
  correct: number;
  /** Precisión en los últimos intentos (0–1); null si hay menos de 3 intentos. */
  mastery: number | null;
  /** ≥ 2 fallos en los últimos 3 intentos. */
  struggling: boolean;
}

export const MASTERY_WINDOW = 8;
export const WEAK_BELOW = 0.7;

export function conceptMastery(events: readonly AppEvent[]): Map<string, ConceptMastery> {
  const byConcept = new Map<string, boolean[]>();
  for (const a of firstAttempts(events))
    for (const c of new Set(a.conceptIds))
      (byConcept.get(c) ?? byConcept.set(c, []).get(c)!).push(a.correct);
  const out = new Map<string, ConceptMastery>();
  for (const [conceptId, results] of byConcept) {
    const recent = results.slice(-MASTERY_WINDOW);
    const last3 = results.slice(-3);
    out.set(conceptId, {
      conceptId,
      attempts: results.length,
      correct: results.filter(Boolean).length,
      mastery: results.length >= 3 ? recent.filter(Boolean).length / recent.length : null,
      struggling: last3.length >= 3 && last3.filter((r) => !r).length >= 2,
    });
  }
  return out;
}

export type ConceptGraph = Record<string, { prerequisites: readonly string[] }>;

/**
 * Prerrequisitos (hasta 2 niveles) de los conceptos en dificultad que están flojos o sin practicar:
 * fallar un concepto refuerza también lo que se necesita para entenderlo (TEMARIO §4).
 */
export function weakPrerequisites(
  mastery: ReadonlyMap<string, ConceptMastery>,
  graph: ConceptGraph,
  seenConcepts: ReadonlySet<string> = new Set(),
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string, depth: number) => {
    if (depth > 2) return;
    for (const p of graph[id]?.prerequisites ?? []) {
      if (seen.has(p)) continue;
      seen.add(p);
      const m = mastery.get(p);
      const weak = m ? m.mastery !== null && m.mastery < WEAK_BELOW : !seenConcepts.has(p);
      if (weak) out.push(p);
      visit(p, depth + 1);
    }
  };
  for (const m of mastery.values()) if (m.struggling) visit(m.conceptId, 1);
  return out;
}

/* ---------- Armado de la sesión de repaso ---------- */

export type ReviewReason = 'vencida' | 'refuerzo' | 'error' | 'tema';

export interface ReviewItem {
  exerciseId: string;
  lessonId: string;
  reason: ReviewReason;
}

/** Reparte los elementos para que no salgan seguidos dos del mismo concepto o lección (intercalado). */
export function interleave<T extends { lessonId: string }>(
  items: readonly T[],
  key: (t: T) => string = (t) => t.lessonId,
): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) (groups.get(key(it)) ?? groups.set(key(it), []).get(key(it))!).push(it);
  const queues = [...groups.values()].sort((a, b) => b.length - a.length);
  const out: T[] = [];
  while (queues.some((q) => q.length)) {
    for (const q of queues) if (q.length) out.push(q.shift()!);
  }
  return out;
}

export interface BuildReviewInput {
  cards: ReadonlyMap<string, SrsCard>;
  catalog: readonly ExerciseRef[];
  mastery: ReadonlyMap<string, ConceptMastery>;
  graph: ConceptGraph;
  today: string;
  max?: number;
  tz?: string;
}

/**
 * Sesión de repaso (Due diligence): primero el refuerzo de prerrequisitos flojos de los conceptos en dificultad,
 * después las tarjetas vencidas; máximo 15, intercaladas.
 */
export function buildReview(input: BuildReviewInput): ReviewItem[] {
  const max = input.max ?? MAX_REVIEW_CARDS;
  const byId = new Map(input.catalog.map((e) => [e.id, e]));
  const chosen = new Map<string, ReviewItem>();
  const add = (id: string, reason: ReviewReason) => {
    const ref = byId.get(id);
    if (!ref || chosen.has(id) || chosen.size >= max) return;
    chosen.set(id, { exerciseId: id, lessonId: ref.lessonId, reason });
  };

  // 1) refuerzo: a lo sumo la mitad de la sesión
  const seenConcepts = new Set(input.mastery.keys());
  const weak = weakPrerequisites(input.mastery, input.graph, seenConcepts);
  const reinforceBudget = Math.max(1, Math.floor(max / 2));
  let reinforced = 0;
  for (const concept of weak) {
    const candidates = input.catalog.filter((e) => e.concepts.includes(concept));
    // primero los que ya se han respondido (tarjeta existente), luego los que no
    candidates.sort(
      (a, b) =>
        Number(input.cards.has(b.id)) - Number(input.cards.has(a.id)) || a.id.localeCompare(b.id),
    );
    for (const c of candidates.slice(0, 2)) {
      if (reinforced >= reinforceBudget) break;
      if (!chosen.has(c.id)) reinforced++;
      add(c.id, 'refuerzo');
    }
  }
  // 2) vencidas
  for (const c of dueCards(input.cards, {
    today: input.today,
    catalog: input.catalog,
    tz: input.tz,
  }))
    add(c.exerciseId, 'vencida');

  return interleave([...chosen.values()]);
}

/** Ejercicios cuyo último intento fue un fallo (Mis errores), los más recientes primero. */
export function recentMistakes(
  cards: ReadonlyMap<string, SrsCard>,
  catalog: readonly ExerciseRef[],
  max = MAX_REVIEW_CARDS,
): ReviewItem[] {
  const live = new Set(catalog.map((e) => e.id));
  return interleave(
    [...cards.values()]
      .filter((c) => live.has(c.exerciseId) && !c.lastCorrect)
      .sort((a, b) => b.lastReviewAt.localeCompare(a.lastReviewAt))
      .slice(0, max)
      .map((c) => ({ exerciseId: c.exerciseId, lessonId: c.lessonId, reason: 'error' as const })),
  );
}

/** Práctica por tema: ejercicios de un concepto; primero los vencidos o fallados, luego el resto. */
export function practiceConcept(
  conceptId: string,
  cards: ReadonlyMap<string, SrsCard>,
  catalog: readonly ExerciseRef[],
  today: string,
  max = 10,
): ReviewItem[] {
  const refs = catalog.filter((e) => e.concepts.includes(conceptId));
  const priority = (id: string): number => {
    const c = cards.get(id);
    if (!c) return 2; // aún sin practicar
    if (!c.lastCorrect) return 0;
    return dueDay(c) <= today ? 1 : 3;
  };
  return interleave(
    refs
      .slice()
      .sort((a, b) => priority(a.id) - priority(b.id) || a.id.localeCompare(b.id))
      .slice(0, max)
      .map((e) => ({ exerciseId: e.id, lessonId: e.lessonId, reason: 'tema' as const })),
  );
}

/** Fecha en que vencerá una tarjeta, como clave de día; útil para tests y para mostrar "vuelve el …". */
export const nextReviewDay = (c: SrsCard, tz?: string): string => dueDay(c, tz);

/* ---------- Bloques de la sesión diaria (2.2) ---------- */

/**
 * Repaso en lugar del minijuego: primero los fallos recientes, luego los ejercicios de los conceptos más flojos
 * y, si faltan, lo que antes vence. Todo intercalado y acotado a `n`.
 */
export function buildPractice(input: {
  cards: ReadonlyMap<string, SrsCard>;
  catalog: readonly ExerciseRef[];
  mastery: ReadonlyMap<string, ConceptMastery>;
  today: string;
  n: number;
  exclude?: ReadonlySet<string>;
}): ReviewItem[] {
  const { cards, catalog, mastery, today, n } = input;
  const taken = new Set(input.exclude ?? []);
  const out: ReviewItem[] = [];
  const push = (items: readonly ReviewItem[]) => {
    for (const it of items) {
      if (out.length >= n) return;
      if (taken.has(it.exerciseId)) continue;
      taken.add(it.exerciseId);
      out.push(it);
    }
  };
  push(recentMistakes(cards, catalog, n));
  const weakest = [...mastery.values()]
    .filter((m) => m.mastery !== null)
    .sort((a, b) => (a.mastery ?? 1) - (b.mastery ?? 1) || a.conceptId.localeCompare(b.conceptId));
  for (const m of weakest) push(practiceConcept(m.conceptId, cards, catalog, today, n));
  // lo que antes vence entre lo ya practicado
  const live = new Set(catalog.map((e) => e.id));
  push(
    [...cards.values()]
      .filter((c) => live.has(c.exerciseId))
      .sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
      .map((c) => ({ exerciseId: c.exerciseId, lessonId: c.lessonId, reason: 'tema' as const })),
  );
  return interleave(out.slice(0, n));
}

/**
 * Reto del día (o Encargo del jefe): ejercicios de lo ya estudiado, elegidos de forma determinista por el día,
 * que no se hayan respondido hoy. Mezcla lecciones para que haga falta recordar, no seguir el hilo.
 */
export function buildChallenge(input: {
  catalog: readonly ExerciseRef[];
  completedLessons: ReadonlySet<string>;
  day: string;
  n: number;
  answeredToday?: ReadonlySet<string>;
  shuffle: <T>(items: readonly T[], seed: string) => T[];
}): ReviewItem[] {
  const pool = input.catalog.filter(
    (e) => input.completedLessons.has(e.lessonId) && !(input.answeredToday ?? new Set()).has(e.id),
  );
  const picked = input.shuffle(pool, `reto:${input.day}`).slice(0, input.n);
  return interleave(
    picked.map((e) => ({ exerciseId: e.id, lessonId: e.lessonId, reason: 'tema' as const })),
  );
}
