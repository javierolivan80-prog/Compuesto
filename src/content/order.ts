import curriculumJson from '../../content/es/curriculum.json';
import { levelOrder } from '../engine/floors';

/*
 * Orden del temario (plantas de `floors.ts`): primero la planta, luego la posición de la unidad en curriculum.json
 * y, dentro de la unidad, `order` o el número de la lección. La Base (nivel 0) queda fuera del Camino.
 */

interface CurriculumLevels {
  levels: { level: number; base?: boolean; units: { id: string }[] }[];
}
const curriculum = curriculumJson as CurriculumLevels;

const unitPosition = new Map(
  curriculum.levels.flatMap((l) => l.units.map((u, i) => [u.id, i] as const)),
);

export interface Orderable {
  id: string;
  level: number;
  unit: number;
  order?: number;
}

const lessonNumber = (id: string) => Number(/-l(\d+)$/.exec(id)?.[1] ?? 0);

export function compareLessons(a: Orderable, b: Orderable): number {
  const ua = unitPosition.get(`n${a.level}-u${a.unit}`) ?? a.unit;
  const ub = unitPosition.get(`n${b.level}-u${b.unit}`) ?? b.unit;
  return (
    levelOrder(a.level) - levelOrder(b.level) ||
    ua - ub ||
    (a.order ?? lessonNumber(a.id)) - (b.order ?? lessonNumber(b.id)) ||
    a.id.localeCompare(b.id, 'es', { numeric: true })
  );
}

/** Las lecciones del Camino: todo menos la Base. */
export const isBaseLevel = (level: number): boolean =>
  curriculum.levels.some((l) => l.level === level && l.base);
