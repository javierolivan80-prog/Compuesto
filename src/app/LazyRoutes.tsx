import { useMemo } from 'react';
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
  buildReview,
  PLACEMENT_PREFIX,
  conceptMastery,
  interleave,
  practiceConcept,
  projectCards,
  recentMistakes,
  type ReviewItem,
} from '../engine/srs';
import { todayKey } from '../engine/stats';
import { ReviewScreen } from '../features/practicar/ReviewScreen';
import { LessonScreen } from '../features/lesson/LessonScreen';
import { GameHost } from '../features/games/GameHost';
import { SessionScreen } from '../features/session/SessionScreen';
import { PlacementScreen } from '../features/placement/PlacementScreen';

/* Rutas que necesitan el contenido completo: se cargan en un trozo aparte para que el arranque sea ligero. */

export function LessonRoute({ id, onExit }: { id: string; onExit: () => void }) {
  const lesson = getLesson(id);
  if (!lesson) return null;
  return <LessonScreen key={lesson.id} lesson={lesson} onExit={onExit} />;
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
  mode: 'due' | 'errores' | 'tema';
  conceptId?: string;
  events: readonly AppEvent[];
  onExit: () => void;
}

/** Repaso (Due diligence), Mis errores o práctica por tema. La lista se fija al entrar y no cambia durante la sesión. */
export function ReviewRoute({ mode, conceptId, events, onExit }: ReviewRouteProps) {
  const { title, items } = useMemo(() => {
    const catalog = exerciseCatalog();
    const cards = projectCards(events, srsOptions);
    const today = todayKey(new Date());
    if (mode === 'errores') return { title: 'Mis errores', items: recentMistakes(cards, catalog) };
    if (mode === 'tema' && conceptId)
      return {
        title: `Tema: ${conceptName(conceptId)}`,
        items: practiceConcept(conceptId, cards, catalog, today),
      };
    return {
      title: 'Due diligence',
      items: buildReview({
        cards,
        catalog,
        mastery: conceptMastery(events),
        graph: conceptGraph(),
        today,
      }),
    };
    // las dependencias se fijan al montar: la sesión no se recalcula con cada respuesta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <ReviewScreen title={title} items={items} onExit={onExit} />;
}

/** Examen cronometrado de una unidad: 10 preguntas sin feedback hasta el final. */
export function ExamRoute({ unitId, onExit }: { unitId: string; onExit: () => void }) {
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
    />
  );
}

export function SessionRoute({ onExit }: { onExit: () => void }) {
  return <SessionScreen onExit={onExit} />;
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
