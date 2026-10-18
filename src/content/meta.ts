/*
 * Metadatos ligeros del contenido para la carga inicial (Inicio, rutas y onboarding), generados al compilar
 * (módulo virtual de vite.config.ts). La app arranca sin traerse ni validar las 60+ lecciones completas; esas
 * viven en `library.ts` y se cargan al entrar en una lección.
 */
import curriculumJson from '../../content/es/curriculum.json';
import { compareLessons, isBaseLevel } from './order';

import { lessons as rawLessons, placements as rawPlacements } from 'virtual:content-index';

/** En producción solo se juega lo reviewed/published; en desarrollo también los draft. */
const PLAYABLE: string[] = import.meta.env.DEV
  ? ['draft', 'reviewed', 'published']
  : ['reviewed', 'published'];

export interface LessonMeta {
  id: string;
  title: string;
  level: number;
  unit: number;
  order?: number;
  estimatedMinutes: number;
}

const lessonMeta: LessonMeta[] = rawLessons
  .filter((l) => PLAYABLE.includes(l.status))
  .map(({ id, title, level, unit, order, estimatedMinutes }) => ({
    id,
    title,
    level,
    unit,
    order,
    estimatedMinutes,
  }))
  .sort(compareLessons);

/** Todas las lecciones jugables en el orden del temario (la Base al principio). */
export const allLessonMeta = (): LessonMeta[] => lessonMeta;
/** Las lecciones del Camino, en orden: sin la Base, que es opcional y vive en Practicar. */
export const pathLessonMeta = (): LessonMeta[] => lessonMeta.filter((l) => !isBaseLevel(l.level));
export const hasLesson = (id: string): boolean => lessonMeta.some((l) => l.id === id);
export const lessonMetaOfUnit = (level: number, unit: number): LessonMeta[] =>
  lessonMeta.filter((l) => l.level === level && l.unit === unit);

const placementIds = new Set(
  rawPlacements.filter((p) => PLAYABLE.includes(p.status)).map((p) => p.unitId),
);
export const hasPlacement = (unitId: string): boolean => placementIds.has(unitId);

/* ---------- Curriculum ---------- */

interface CurriculumJson {
  levels: {
    level: number;
    name: string;
    units: { id: string; name: string; concepts: string[] }[];
  }[];
}
const curriculum = curriculumJson as CurriculumJson;

export interface UnitInfo {
  id: string;
  name: string;
  level: number;
  concepts: string[];
}

export const unitsOfLevel = (level: number): UnitInfo[] =>
  (curriculum.levels.find((l) => l.level === level)?.units ?? []).map((u) => ({ ...u, level }));

export const levelName = (level: number): string =>
  curriculum.levels.find((l) => l.level === level)?.name ?? `Nivel ${level}`;

/** unitId → conceptos de la unidad (para contar como "vistos" los de una unidad saltada). */
export const unitConcepts = (): Record<string, string[]> =>
  Object.fromEntries(curriculum.levels.flatMap((l) => l.units).map((u) => [u.id, u.concepts]));
