import { useMemo, useState } from 'react';
import {
  conceptGraph,
  conceptName,
  exerciseCatalog,
  getLesson,
  srsOptions,
  getPlacement,
  unitsOfLevel,
} from '../content/library';
import type { AppEvent } from '../engine/events';
import type { GameId } from '../engine/games/common';
import { seededShuffle } from '../engine/grading';
import {
  PLACEMENT_PREFIX,
  conceptMastery,
  interleave,
  projectCards,
  type ReviewItem,
} from '../engine/srs';
import { practiceBatch, type PracticeMode } from '../engine/next-step';
import { useRepo } from '../db/RepoProvider';
import { t } from '../i18n';
import { todayKey } from '../engine/stats';
import { ReviewScreen } from '../features/practicar/ReviewScreen';
import { LessonScreen } from '../features/lesson/LessonScreen';
import { GameHost } from '../features/games/GameHost';
import { SessionScreen } from '../features/session/SessionScreen';
import { PlacementScreen } from '../features/placement/PlacementScreen';

/* Rutas que necesitan el contenido completo: se cargan en un trozo aparte para que el arranque sea ligero. */

interface LessonRouteProps {
  id: string;
  onExit: () => void;
  onNextLesson: (lessonId: string) => void;
  onKeepPracticing: () => void;
  onPractice: () => void;
}

export function LessonRoute({ id, ...rest }: LessonRouteProps) {
  const lesson = getLesson(id);
  if (!lesson) return null;
  return <LessonScreen key={lesson.id} lesson={lesson} {...rest} />;
}

type PlacementProps = Omit<Parameters<typeof PlacementScreen>[0], 'bank'> & { unitId: string };

export function PlacementRoute({ unitId, ...rest }: PlacementProps) {
  const bank = getPlacement(unitId);
  if (!bank) return null;
  return <PlacementScreen bank={bank} {...rest} />;
}

export const EXAM_QUESTIONS = 10;
export const EXAM_MINUTES = 10;

interface ReviewRouteProps {
  mode: PracticeMode;
  conceptId?: string;
  events: readonly AppEvent[];
  onExit: () => void;
  /** Sin nada estudiado aún: ir a la siguiente lección. */
  onNextLesson: () => void;
}

interface Round {
  n: number;
  /** Ejercicios ya mostrados en esta racha de práctica (no se repiten mientras haya otros). */
  seen: Set<string>;
  items: ReviewItem[];
  extra: boolean;
}

function roundFor(
  mode: PracticeMode,
  conceptId: string | undefined,
  events: readonly AppEvent[],
  seen: Set<string>,
  n: number,
): Round {
  const { items, extra } = practiceBatch({
    mode,
    conceptId,
    cards: projectCards(events, srsOptions),
    catalog: exerciseCatalog(),
    mastery: conceptMastery(events),
    graph: conceptGraph(),
    today: todayKey(new Date()),
    exclude: seen,
  });
  return { n, seen, items, extra };
}

/**
 * Repaso (Due diligence), Mis errores o práctica por tema. Cada tanda se fija al empezar y no cambia mientras se
 * responde; al terminar, «Seguir practicando» carga otra con el estado recién guardado (ritmo libre). Si lo
 * pendiente se acaba, la tanda es práctica extra intercalada con lo ya estudiado.
 */
export function ReviewRoute({ mode, conceptId, events, onExit, onNextLesson }: ReviewRouteProps) {
  const repo = useRepo();
  const [round, setRound] = useState(() => roundFor(mode, conceptId, events, new Set(), 0));
  const more = async () => {
    let fresh = events;
    try {
      fresh = await repo.allEvents();
    } catch (e) {
      console.error('No se pudo leer el progreso para la siguiente tanda', e);
    }
    const seen = new Set(round.seen);
    for (const it of round.items) {
      seen.add(it.exerciseId);
      if (it.cardId) seen.add(it.cardId);
    }
    setRound(roundFor(mode, conceptId, fresh, seen, round.n + 1));
    window.scrollTo(0, 0);
  };
  const title = round.extra
    ? t('flow.extraTitle')
    : mode === 'errores'
      ? 'Mis errores'
      : mode === 'tema' && conceptId
        ? `Tema: ${conceptName(conceptId)}`
        : 'Due diligence';
  return (
    <ReviewScreen
      key={round.n}
      title={title}
      items={round.items}
      hint={round.extra ? t('flow.extraHint') : undefined}
      onExit={onExit}
      onMore={() => void more()}
      onNextLesson={onNextLesson}
    />
  );
}

/** Examen cronometrado de una unidad: 10 preguntas sin feedback hasta el final. */
export function ExamRoute({
  unitId,
  onExit,
  onMore,
}: {
  unitId: string;
  onExit: () => void;
  /** Al terminar: seguir practicando (repaso). */
  onMore: () => void;
}) {
  const { items, name } = useMemo(() => {
    const today = todayKey(new Date());
    const pool = exerciseCatalog().filter(
      (e) => e.unitId === unitId && !e.lessonId.startsWith(PLACEMENT_PREFIX),
    );
    const chosen = seededShuffle(pool, `${unitId}:${today}`).slice(0, EXAM_QUESTIONS);
    const level = Number(/^n(\d+)-/.exec(unitId)?.[1] ?? 0);
    const unit = unitsOfLevel(level).find((u) => u.id === unitId);
    const list: ReviewItem[] = interleave(
      chosen.map((e) => ({ exerciseId: e.id, lessonId: e.lessonId, reason: 'tema' as const })),
    );
    return { items: list, name: unit?.name ?? unitId };
  }, [unitId]);
  return (
    <ReviewScreen
      title={`Examen: ${name}`}
      items={items}
      exam={{ minutes: EXAM_MINUTES }}
      onExit={onExit}
      onMore={onMore}
    />
  );
}

export function SessionRoute({
  onExit,
  onOpenLesson,
}: {
  onExit: () => void;
  onOpenLesson: (lessonId: string) => void;
}) {
  return <SessionScreen onExit={onExit} onOpenLesson={onOpenLesson} />;
}

export function GameRoute({
  id,
  daily,
  onExit,
}: {
  id: GameId;
  daily: boolean;
  onExit: () => void;
}) {
  return <GameHost gameId={id} daily={daily} onExit={onExit} />;
}
