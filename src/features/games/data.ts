import { allLessons, unitConcepts } from '../../content/library';
import type { AppEvent } from '../../engine/events';
import type { BellCard } from '../../engine/games/bell';
import { seenConcepts, type GameContext } from '../../engine/games/catalog';
import { availableHeadlines, type Headline } from '../../engine/games/news';

/** Datos que los juegos sacan del progreso de la persona: conceptos vistos, afirmaciones V/F de lecciones vistas y titulares. */
export interface GameData {
  context: GameContext;
  deck: BellCard[];
  headlines: Headline[];
  withAuction: boolean;
}

export function gameData(events: readonly AppEvent[]): GameData {
  const lessons = allLessons();
  const lessonConcepts = Object.fromEntries(lessons.map((l) => [l.id, l.concepts]));
  const units = unitConcepts();
  const seen = seenConcepts(events, lessonConcepts, units);
  const completed = new Set(
    events.flatMap((e) => (e.type === 'lesson_completed' ? [e.payload.lessonId] : [])),
  );
  const skipped = new Set(
    events.flatMap((e) => (e.type === 'unit_skipped' ? [e.payload.unitId] : [])),
  );
  const deck: BellCard[] = lessons
    .filter((l) => completed.has(l.id) || skipped.has(`n${l.level}-u${l.unit}`))
    .flatMap((l) =>
      l.exercises.flatMap((e) =>
        e.type === 'true_false_swipe'
          ? [{ id: e.id, text: e.statement, answer: e.answer, concepts: e.concepts }]
          : [],
      ),
    );
  return {
    context: { seen, tfCount: deck.length },
    deck,
    headlines: availableHeadlines(seen),
    withAuction: seen.has('subastas'),
  };
}
