import { z } from 'zod';

/* Esquemas de contenido (docs/TEMARIO.md §4–§7, CLAUDE.md §9). Fuente única: la app y content:validate usan estos mismos. */

export const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id en minúsculas con guiones (a-z, 0-9, -)');
export const STATUSES = ['draft', 'reviewed', 'published', 'retired'] as const;
export const BLOOM = ['recordar', 'entender', 'aplicar', 'analizar', 'evaluar', 'crear'] as const;
export const CHARACTERS = ['mentora', 'rival', 'jefe', 'compliance'] as const;
export const REVIEWERS = ['subagente', 'humano'] as const;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha yyyy-mm-dd');
const text = z.string().trim().min(1);

/* ---------- Ejercicios (19 tipos) ---------- */

const exerciseBase = {
  id: slug,
  difficulty: z.number().int().min(1).max(5),
  bloom: z.enum(BLOOM),
  tags: z.array(text).default([]),
  concepts: z.array(slug).min(1, 'cada ejercicio evalúa al menos un concepto'),
  character: z.enum(CHARACTERS).optional(),
  explanation: text,
  hint: text.optional(),
};

/** Explicación específica por opción incorrecta (CLAUDE.md §8): clave = índice de la opción. */
const wrong = z.record(z.string().regex(/^\d+$/), text).optional();
const options = z.array(text).min(2).max(6);
const idx = z.number().int().min(0);

const mc = z.object({
  ...exerciseBase,
  type: z.literal('multiple_choice'),
  prompt: text,
  options,
  answer: idx,
  wrongExplanations: wrong,
});
const ms = z.object({
  ...exerciseBase,
  type: z.literal('multi_select'),
  prompt: text,
  options,
  answers: z.array(idx).min(1),
  wrongExplanations: wrong,
});
const tf = z.object({
  ...exerciseBase,
  type: z.literal('true_false_swipe'),
  statement: text,
  answer: z.boolean(),
});
const mp = z.object({
  ...exerciseBase,
  type: z.literal('match_pairs'),
  prompt: text,
  pairs: z
    .array(z.object({ left: text, right: text }))
    .min(2)
    .max(6),
});
const fb = z.object({
  ...exerciseBase,
  type: z.literal('fill_blank'),
  /** Los huecos se marcan con ___ */
  prompt: text,
  /** Respuestas aceptadas por hueco. */
  answers: z.array(z.array(text).min(1)).min(1),
  freeText: z.boolean().default(false),
});
const os = z.object({
  ...exerciseBase,
  type: z.literal('order_steps'),
  prompt: text,
  /** En el orden correcto; la app los baraja. */
  steps: z.array(text).min(3).max(8),
});
const ni = z.object({
  ...exerciseBase,
  type: z.literal('numeric_input'),
  prompt: text,
  answer: z.number(),
  unit: text.optional(),
  /** Tolerancia relativa en %. 0 = exacto (con un margen numérico de 1e-6). */
  tolerance: z.number().min(0).max(100),
  /** Obligatoria: un test la recalcula y la compara con `answer`. */
  formula: text,
});
const cat = z.object({
  ...exerciseBase,
  type: z.literal('categorize'),
  prompt: text,
  categories: z.array(text).min(2).max(4),
  items: z.array(z.object({ text, category: text })).min(3),
});
const bs = z.object({
  ...exerciseBase,
  type: z.literal('build_statement'),
  statement: z.enum(['balance', 'pyg', 'flujos']),
  prompt: text,
  sections: z
    .array(
      z.object({
        name: text,
        side: z.enum([
          'activo',
          'pasivo',
          'patrimonio',
          'ingresos',
          'gastos',
          'operativo',
          'inversion',
          'financiacion',
        ]),
        rows: z
          .array(z.object({ label: text, value: z.number(), blank: z.boolean().default(false) }))
          .min(1),
      }),
    )
    .min(2),
});
const ss = z.object({
  ...exerciseBase,
  type: z.literal('spreadsheet'),
  prompt: text,
  /** Celdas iniciales: valor o fórmula ("=A1*2"). */
  cells: z.record(z.string().regex(/^[A-Z]+\d+$/), z.union([z.string(), z.number()])),
  target: z.string().regex(/^[A-Z]+\d+$/),
  /** Fórmula de referencia; el validador comprueba que da `expected`. */
  solution: text,
  expected: z.number(),
  tolerance: z.number().min(0).max(100).default(0),
  /** Celdas que la persona puede escribir (por defecto, solo `target`). */
  editable: z.array(z.string().regex(/^[A-Z]+\d+$/)).default([]),
  /** Exige escribir una fórmula (=…) en `target`: un número tecleado a mano no vale. */
  requireFormula: z.boolean().default(true),
  /** Casos ocultos: se cambian celdas de entrada y la fórmula debe dar el valor esperado (comprueba que generaliza). */
  hiddenCases: z
    .array(
      z.object({
        set: z.record(z.string().regex(/^[A-Z]+\d+$/), z.number()),
        expected: z.number(),
      }),
    )
    .default([]),
});
const code = z.object({
  ...exerciseBase,
  type: z.literal('code'),
  language: z.literal('python'),
  prompt: text,
  starter: z.string(),
  hiddenTests: z.array(z.object({ call: text, expected: z.string() })).min(1),
  timeoutMs: z.number().int().min(100).max(10_000).default(3000),
});
const cr = z.object({
  ...exerciseBase,
  type: z.literal('chart_read'),
  prompt: text,
  chart: z.object({
    kind: z.enum(['price', 'yield_curve', 'bars', 'line']),
    /** Misma semilla → mismo gráfico. */
    seed: z.number().int(),
    points: z.number().int().min(5).max(500),
  }),
  options,
  answer: idx,
  /** Descripción textual del gráfico para lectores de pantalla. */
  altText: text,
  wrongExplanations: wrong,
});
const sc = z.object({
  ...exerciseBase,
  type: z.literal('scenario'),
  situation: text,
  prompt: text,
  options,
  answer: idx,
  wrongExplanations: wrong,
});
const se = z.object({
  ...exerciseBase,
  type: z.literal('spot_the_error'),
  prompt: text,
  /** Líneas del razonamiento; una contiene el error. */
  lines: z.array(text).min(3).max(8),
  errorIndex: idx,
});
const sl = z.object({
  ...exerciseBase,
  type: z.literal('slider_estimate'),
  prompt: text,
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  answer: z.number(),
  tolerance: z.number().min(0).max(100),
  unit: text.optional(),
});
const caseStep = z.object({
  ...exerciseBase,
  type: z.literal('case_step'),
  caseId: slug,
  intro: text,
  steps: z.array(z.object({ prompt: text, options, answer: idx, explanation: text })).min(2),
});
const dr = z.object({
  ...exerciseBase,
  type: z.literal('document_read'),
  excerpt: text,
  source: z.string().url(),
  documentDate: isoDay,
  questions: z.array(z.object({ prompt: text, options, answer: idx })).min(1),
});
const ba = z.object({
  ...exerciseBase,
  type: z.literal('best_argument'),
  claim: text,
  options,
  answer: idx,
  /** Por qué falla cada argumento incorrecto (índice → motivo). */
  wrongExplanations: z.record(z.string().regex(/^\d+$/), text),
});
const sx = z.object({
  ...exerciseBase,
  type: z.literal('self_explain'),
  prompt: text,
  modelAnswer: text,
  /** Rúbrica de exactamente 3 criterios. */
  rubric: z.tuple([text, text, text]),
});

export const exerciseSchema = z.discriminatedUnion('type', [
  mc,
  ms,
  tf,
  mp,
  fb,
  os,
  ni,
  cat,
  bs,
  ss,
  code,
  cr,
  sc,
  se,
  sl,
  caseStep,
  dr,
  ba,
  sx,
]);
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise['type'];

/** TEMARIO §6: reconocer = 1–4, producir = 5–11, aplicar y argumentar = 12–19. */
export const EXERCISE_CATEGORY: Record<ExerciseType, 'reconocer' | 'producir' | 'aplicar'> = {
  multiple_choice: 'reconocer',
  multi_select: 'reconocer',
  true_false_swipe: 'reconocer',
  match_pairs: 'reconocer',
  fill_blank: 'producir',
  order_steps: 'producir',
  numeric_input: 'producir',
  categorize: 'producir',
  build_statement: 'producir',
  spreadsheet: 'producir',
  code: 'producir',
  chart_read: 'aplicar',
  scenario: 'aplicar',
  spot_the_error: 'aplicar',
  slider_estimate: 'aplicar',
  case_step: 'aplicar',
  document_read: 'aplicar',
  best_argument: 'aplicar',
  self_explain: 'aplicar',
};
export const EXERCISE_TYPES = Object.keys(EXERCISE_CATEGORY) as ExerciseType[];

/* ---------- Lección ---------- */

const introBlock = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('card'),
    text,
    /** Término clave: se subraya con el trazo dorado. */ term: text.optional(),
  }),
  z.object({ type: z.literal('example'), text }),
  z.object({
    type: z.literal('visual'),
    component: text,
    props: z.record(z.string(), z.unknown()).default({}),
  }),
]);

export const sourceSchema = z.object({
  title: text,
  url: z.string().url(),
  date: isoDay.optional(),
});

export const lessonSchema = z.object({
  id: slug,
  version: z.number().int().min(1),
  status: z.enum(STATUSES),
  reviewedBy: z.array(z.enum(REVIEWERS)).default([]),
  level: z.number().int().min(0).max(10),
  /** Ramas: id de la rama; el nivel es el de desbloqueo. */
  track: slug.optional(),
  unit: z.number().int().min(1),
  title: text,
  estimatedMinutes: z.number().int().min(1).max(10),
  objectives: z.array(text).min(1),
  concepts: z.array(slug).min(1),
  /** Empresas del universo ficticio que aparecen (ids de companies.json). */
  companies: z.array(slug).default([]),
  /** Lección histórica: permite nombrar empresas reales. */
  historical: z.boolean().default(false),
  intro: z.array(introBlock).default([]),
  exercises: z.array(exerciseSchema).min(1),
  realWorld: text.optional(),
  sources: z.array(sourceSchema).default([]),
  /** Fecha límite para volver a verificar normativa/fiscalidad; null = no caduca. */
  verificarAntesDe: isoDay.nullable().default(null),
  lastReviewed: isoDay,
});
export type Lesson = z.infer<typeof lessonSchema>;

/* ---------- Glosario, test de salto, curriculum ---------- */

export const glossarySchema = z.array(
  z.object({
    id: slug,
    term: text,
    definition: text,
    level: z.number().int().min(0).max(10),
    concepts: z.array(slug).default([]),
    verificarAntesDe: isoDay.nullable().default(null),
    sources: z.array(sourceSchema).default([]),
  }),
);

/** Test de salto: 8 preguntas por unidad, etiquetadas por concepto (TEMARIO §5). */
export const placementSchema = z.object({
  id: slug,
  unitId: slug,
  version: z.number().int().min(1),
  status: z.enum(STATUSES),
  reviewedBy: z.array(z.enum(REVIEWERS)).default([]),
  questions: z
    .array(z.union([mc, tf, ms]))
    .length(8, 'el test de salto tiene exactamente 8 preguntas'),
  sources: z.array(sourceSchema).default([]),
  verificarAntesDe: isoDay.nullable().default(null),
});
export type Placement = z.infer<typeof placementSchema>;

export const curriculumSchema = z.object({
  levels: z.array(
    z.object({
      level: z.number().int().min(0).max(10),
      name: text,
      rank: text,
      floor: text,
      weeks: text,
      units: z
        .array(z.object({ id: slug, name: text, concepts: z.array(slug).default([]) }))
        .default([]),
    }),
  ),
  tracks: z.array(
    z.object({
      id: slug,
      name: text,
      unlocksAfterLevel: z.number().int().min(0).max(9),
      weeks: z.number().int().min(1),
    }),
  ),
});

/* ---------- Mapa de conceptos ---------- */

export const conceptSchema = z.object({
  id: slug,
  name: text,
  /** Nivel del troncal (0–9) o nivel de desbloqueo de la rama. */
  level: z.number().int().min(0).max(10),
  track: slug.optional(),
  prerequisites: z.array(slug).default([]),
  /** Solo en el detalle completo (N0–N1). */
  description: text.optional(),
  unit: slug.optional(),
});
export const conceptsSchema = z.array(conceptSchema);
export type Concept = z.infer<typeof conceptSchema>;

/* ---------- Empresas ficticias ---------- */

const money = z.number().int();
export const yearAccountsSchema = z.object({
  year: z.number().int(),
  pyg: z.object({
    ingresos: money,
    coste_ventas: money,
    gastos_operativos: money,
    amortizacion: money,
    ebit: money,
    gastos_financieros: money,
    bai: money,
    impuestos: money,
    resultado_neto: money,
  }),
  balance: z.object({
    caja: money,
    clientes: money,
    existencias: money,
    inmovilizado: money,
    total_activo: money,
    proveedores: money,
    deuda: money,
    total_pasivo: money,
    capital: money,
    reservas: money,
    total_patrimonio: money,
  }),
  flujos: z.object({
    operativo: money,
    inversion: money,
    financiacion: money,
    variacion_caja: money,
  }),
  dividendos: money,
  ampliacion_capital: money,
});

export const companySchema = z.object({
  id: slug,
  name: text,
  legalForm: text,
  sector: text,
  city: text,
  description: text,
  unit: z.literal('miles de €'),
  sharesOutstanding: z.number().int().positive(),
  years: z.array(yearAccountsSchema).min(3),
});
export const companiesSchema = z.array(companySchema);
export type Company = z.infer<typeof companySchema>;
