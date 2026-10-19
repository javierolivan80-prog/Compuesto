import companiesJson from '../../content/shared/companies.json';
import { instantiate, isParametric } from '../engine/params';
import { compareLessons } from './order';
import conceptsJson from '../../content/shared/concepts.json';
import type { ExerciseRef, ProjectOptions } from '../engine/srs';
import glossaryJson from '../../content/es/glossary.json';
import {
  companiesSchema,
  EXERCISE_CATEGORY,
  conceptsSchema,
  glossarySchema,
  lessonSchema,
  placementSchema,
  type Exercise,
  type GlossaryEntry,
  type Lesson,
  type Placement,
} from './schemas';

/** Contenido empaquetado con la app (CLAUDE.md §3b): se importa en la build, funciona sin conexión. */
const modules = import.meta.glob('/content/es/levels/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

/** En producción solo se juega lo reviewed/published; en desarrollo también los draft. */
const PLAYABLE: Lesson['status'][] = import.meta.env.DEV
  ? ['draft', 'reviewed', 'published']
  : ['reviewed', 'published'];

function load(): Lesson[] {
  const out: Lesson[] = [];
  for (const [path, data] of Object.entries(modules)) {
    const r = lessonSchema.safeParse(data);
    if (!r.success) {
      // content:validate lo habría parado en CI; en ejecución se ignora la lección rota en vez de romper la app
      console.error(`Lección no válida: ${path}`, r.error.issues[0]);
      continue;
    }
    if (PLAYABLE.includes(r.data.status)) out.push(r.data);
  }
  return out.sort(compareLessons);
}

const lessons = load();

export const allLessons = (): Lesson[] => lessons;
export const getLesson = (id: string): Lesson | undefined => lessons.find((l) => l.id === id);
export const lessonsOfUnit = (level: number, unit: number): Lesson[] =>
  lessons.filter((l) => l.level === level && l.unit === unit);

/* ---------- Curriculum (ligero, en meta.ts) y tests de salto ---------- */

export { levelName, unitConcepts, unitsOfLevel, type UnitInfo } from './meta';

const placementModules = import.meta.glob('/content/es/placement/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const placements: Placement[] = [];
for (const [path, data] of Object.entries(placementModules)) {
  const r = placementSchema.safeParse(data);
  if (!r.success) console.error(`Test de salto no válido: ${path}`, r.error.issues[0]);
  else if (PLAYABLE.includes(r.data.status)) placements.push(r.data);
}

export const getPlacement = (unitId: string): Placement | undefined =>
  placements.find((p) => p.unitId === unitId);

/* ---------- Glosario ---------- */

const glossaryAll = glossarySchema.parse(glossaryJson);
const glossaryPlayable = glossaryAll
  .filter((g) => PLAYABLE.includes(g.status))
  .sort((a, b) => a.term.localeCompare(b.term, 'es'));

export const glossary = (): GlossaryEntry[] => glossaryPlayable;

const companiesAll = companiesSchema.parse(companiesJson);
export const companies = () => companiesAll;

/** Texto de un ejercicio (de una lección o de un test de salto) a partir de su id, para listados como "más fallados". */
export function findExerciseText(id: string): { prompt: string; where: string } | undefined {
  for (const l of lessons) {
    const raw = l.exercises.find((x) => x.id === id);
    // los paramétricos se listan con las cifras del enunciado, nunca con marcadores {nombre}
    const e = raw && instantiate(raw).exercise;
    if (e)
      return {
        prompt: 'prompt' in e ? e.prompt : 'statement' in e ? e.statement : id,
        where: l.title,
      };
  }
  for (const p of placements) {
    const e = p.questions.find((x) => x.id === id);
    if (e)
      return {
        prompt: 'prompt' in e ? e.prompt : e.statement,
        where: `Test de salto · ${p.unitId}`,
      };
  }
  return undefined;
}

/* ---------- Catálogo de ejercicios y grafo de conceptos (repaso espaciado, Fase 2) ---------- */

const conceptsAll = conceptsSchema.parse(conceptsJson);

export const conceptName = (id: string): string => conceptsAll.find((c) => c.id === id)?.name ?? id;

/** concepto → prerrequisitos, para reforzar lo flojo cuando se falla un concepto. */
export const conceptGraph = (): Record<string, { prerequisites: string[] }> =>
  Object.fromEntries(conceptsAll.map((c) => [c.id, { prerequisites: c.prerequisites }]));

/**
 * Ejercicios vivos (de lecciones jugables y de tests de salto) como referencias para el repaso; los de lecciones
 * retiradas no están aquí y sus tarjetas se archivan. Las preguntas de un test de salto solo tienen tarjeta si la
 * unidad se saltó (comprobación a los 7 días, tarea 2.12).
 */
export const exerciseCatalog = (): ExerciseRef[] => [
  ...lessons.flatMap((l) =>
    l.exercises.map((e) => ({
      id: e.id,
      lessonId: l.id,
      unitId: `n${l.level}-u${l.unit}`,
      concepts: e.concepts,
      category: EXERCISE_CATEGORY[e.type],
      parametric: isParametric(e),
    })),
  ),
  ...placements.flatMap((p) =>
    p.questions.map((q) => ({
      id: q.id,
      lessonId: p.id,
      unitId: p.unitId,
      concepts: q.concepts,
      category: EXERCISE_CATEGORY[q.type],
      parametric: false,
    })),
  ),
];

const typeById = new Map([
  ...lessons.flatMap((l) => l.exercises.map((e) => [e.id, e.type] as const)),
  ...placements.flatMap((p) => p.questions.map((q) => [q.id, q.type] as const)),
]);
/** Opciones del repaso espaciado: el tipo de cada ejercicio, para la mediana de tiempo de la calificación Hard. */
export const srsOptions: ProjectOptions = { typeOf: (id) => typeById.get(id) };

/** Ejercicio y de dónde sale (una lección o un test de salto), para el repaso. */
export function getExerciseById(
  id: string,
): { exercise: Exercise; lesson: { id: string; title: string } } | undefined {
  for (const l of lessons) {
    const exercise = l.exercises.find((e) => e.id === id);
    if (exercise) return { exercise, lesson: l };
  }
  for (const p of placements) {
    const exercise = p.questions.find((q) => q.id === id);
    if (exercise) return { exercise, lesson: { id: p.id, title: 'Test de salto' } };
  }
  return undefined;
}
