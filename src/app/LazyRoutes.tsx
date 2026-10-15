import { getLesson, getPlacement } from '../content/library';
import { LessonScreen } from '../features/lesson/LessonScreen';
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
