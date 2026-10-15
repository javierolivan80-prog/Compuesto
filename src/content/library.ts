import { lessonSchema, type Lesson } from './schemas';

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
