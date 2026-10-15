import companiesJson from '../../content/shared/companies.json';
import glossaryJson from '../../content/es/glossary.json';
import {
  companiesSchema,
  glossarySchema,
  lessonSchema,
  placementSchema,
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
  return out.sort(
    (a, b) =>
      a.level - b.level || a.unit - b.unit || a.id.localeCompare(b.id, 'es', { numeric: true }),
  );
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
    const e = l.exercises.find((x) => x.id === id);
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
