import {
  MAX_REVIEW_CARDS,
  buildPractice,
  buildReview,
  practiceConcept,
  recentMistakes,
  type ConceptGraph,
  type ConceptMastery,
  type ExerciseRef,
  type ReviewItem,
  type SrsCard,
} from './srs';

/*
 * Ritmo libre (DECISIONES.md, 29/10/2026): después de cualquier actividad siempre hay un paso siguiente.
 * Puro y testeado: qué lección del Camino toca ahora y qué tanda de práctica se carga al pedir «Seguir practicando».
 */

export interface PathLessonRef {
  id: string;
  level: number;
  unit: number;
}

export interface PathProgress {
  lessons: Readonly<Record<string, { status: string } | undefined>>;
  skippedUnits: readonly string[];
}

/**
 * Lecciones pendientes del Camino, en su orden: sin completar y fuera de las unidades dominadas por test de salto.
 * `lessons` llega ya ordenado (y sin la Base); no hay ningún muro de rango, XP ni día.
 */
export function pendingPathLessons<T extends PathLessonRef>(
  lessons: readonly T[],
  progress: PathProgress,
): T[] {
  const skipped = new Set(progress.skippedUnits);
  return lessons.filter(
    (l) => progress.lessons[l.id]?.status !== 'completed' && !skipped.has(`n${l.level}-u${l.unit}`),
  );
}

/** Siguiente lección del Camino (la misma que propone Inicio); `null` si ya no queda ninguna. */
export function nextPathLesson(
  lessons: readonly PathLessonRef[],
  progress: PathProgress,
): string | null {
  return pendingPathLessons(lessons, progress)[0]?.id ?? null;
}

export type PracticeMode = 'due' | 'errores' | 'tema';

export interface PracticeBatchInput {
  mode: PracticeMode;
  conceptId?: string;
  cards: ReadonlyMap<string, SrsCard>;
  catalog: readonly ExerciseRef[];
  mastery: ReadonlyMap<string, ConceptMastery>;
  graph: ConceptGraph;
  today: string;
  /** Ejercicios ya respondidos en esta racha de práctica: no se repiten mientras haya otros. */
  exclude?: ReadonlySet<string>;
  /** Tamaño de cada tanda (por defecto, el tope del repaso). */
  max?: number;
}

export interface PracticeBatch {
  items: ReviewItem[];
  /** `true` si lo pendiente del modo se acabó y la tanda es práctica extra intercalada con lo ya estudiado. */
  extra: boolean;
}

/**
 * Una tanda de práctica. Primero lo que pide el modo (vencidas y refuerzo, mis errores o el tema) sin lo ya visto;
 * si no queda nada, práctica extra con lo ya estudiado (fallos, conceptos flojos y lo que antes vence). Solo
 * devuelve una tanda vacía si aún no hay nada estudiado.
 */
export function practiceBatch(input: PracticeBatchInput): PracticeBatch {
  const max = input.max ?? MAX_REVIEW_CARDS;
  const exclude = input.exclude ?? new Set<string>();
  const fresh = (it: ReviewItem) => !exclude.has(it.exerciseId) && !exclude.has(it.cardId ?? '');
  let primary: ReviewItem[];
  if (input.mode === 'errores') primary = recentMistakes(input.cards, input.catalog, Infinity);
  else if (input.mode === 'tema' && input.conceptId)
    primary = practiceConcept(input.conceptId, input.cards, input.catalog, input.today, Infinity);
  else
    primary = buildReview({
      cards: input.cards,
      catalog: input.catalog,
      mastery: input.mastery,
      graph: input.graph,
      today: input.today,
      max: max + exclude.size,
    });
  const items = primary.filter(fresh).slice(0, max);
  if (items.length) return { items, extra: false };

  const practice = (ex: ReadonlySet<string>) =>
    buildPractice({
      cards: input.cards,
      catalog: input.catalog,
      mastery: input.mastery,
      today: input.today,
      n: max,
      exclude: ex,
    });
  const extra = practice(exclude);
  // si ya se ha visto todo lo estudiado, se vuelve a empezar por lo que antes toca
  return { items: extra.length ? extra : practice(new Set()), extra: true };
}
