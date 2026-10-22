import { parseNumber, type NumberLocale } from './number-parse';
import { mulberry32 } from './prng';
import { evaluateSheet, isFormula, numericValue, type CellInput } from './sheet';
import { rowKey } from './statement';
import type { Exercise } from '../content/schemas';

/* Corrección pura de los 8 primeros tipos (TEMARIO §6). Sin React, sin IndexedDB. */

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

const within = (v: number | null, expected: number, tolerancePct: number) =>
  v !== null &&
  Math.abs(v - expected) <=
    Math.max((Math.abs(expected) * tolerancePct) / 100, Math.abs(expected) * 1e-6, 1e-9);

/**
 * Corrige por RESULTADO, no por el texto de la fórmula: se evalúa la hoja con lo escrito y se compara el valor de `target`.
 * Con `requireFormula` hay que escribir una fórmula (=…); además se prueban los casos ocultos cambiando las entradas.
 */
export function gradeSpreadsheet(
  e: Of<'spreadsheet'>,
  entered: Record<string, string>,
): GradeResult {
  const editable = new Set(e.editable.length ? e.editable : [e.target]);
  const user: Record<string, CellInput> = {};
  for (const [ref, text] of Object.entries(entered))
    if (editable.has(ref) && text.trim() !== '') user[ref] = text.trim();
  const targetText = user[e.target];
  if (targetText === undefined) return { correct: false, empty: true };
  if (e.requireFormula && !isFormula(targetText)) return ko({ wrongItems: [e.target] });
  const run = (set: Record<string, number>) =>
    numericValue(evaluateSheet({ ...e.cells, ...user, ...set })[e.target]);
  const value = run({});
  if (!within(value, e.expected, e.tolerance)) return ko({ parsed: value, wrongItems: [e.target] });
  for (const c of e.hiddenCases)
    if (!within(run(c.set), c.expected, e.tolerance))
      return ko({ parsed: value, wrongItems: [e.target] });
  return ok({ parsed: value });
}

export type Answer =
  | { type: 'multiple_choice'; choice: number | null }
  | { type: 'multi_select'; choices: number[] }
  | { type: 'true_false_swipe'; value: boolean | null }
  /** left → right elegido por la persona */
  | { type: 'match_pairs'; pairs: Record<string, string> }
  | { type: 'fill_blank'; values: string[] }
  /** Orden propuesto como lista de índices de `steps` (0 = el primer paso correcto) */
  | { type: 'order_steps'; order: number[] }
  | { type: 'numeric_input'; text: string; locale?: NumberLocale }
  /** texto del elemento → categoría elegida */
  | { type: 'categorize'; assignments: Record<string, string> }
  /** Contenido escrito en las celdas editables (valor o fórmula) */
  | { type: 'spreadsheet'; cells: Record<string, string> }
  /** Huecos del estado financiero: clave "sección.fila" → texto escrito */
  | { type: 'build_statement'; values: Record<string, string>; locale?: NumberLocale }
  | { type: 'chart_read'; choice: number | null }
  | { type: 'scenario'; choice: number | null }
  | { type: 'best_argument'; choice: number | null }
  | { type: 'spot_the_error'; index: number | null }
  /** null hasta que la persona mueve el control: no hay valor inicial que sugiera la respuesta. */
  | { type: 'slider_estimate'; value: number | null }
  /** Una elección por paso; solo se puede comprobar con todos los pasos contestados. */
  | { type: 'case_step'; choices: (number | null)[] }
  | { type: 'document_read'; choices: (number | null)[] }
  /** Texto propio, si ya se ha visto la respuesta modelo y la autoevaluación con la rúbrica (3 criterios). */
  | { type: 'self_explain'; text: string; revealed: boolean; rubric: [boolean, boolean, boolean] };

/** Mínimo de criterios de la rúbrica que hay que marcar para dar el ejercicio por bueno. */
export const SELF_EXPLAIN_PASS = 2;
/** Autoevaluarse no debe premiar igual que un acierto corregido: la mitad del XP. */
export const SELF_EXPLAIN_XP_FACTOR = 0.5;
export const xpFactor = (e: Pick<Exercise, 'type'>): number =>
  e.type === 'self_explain' ? SELF_EXPLAIN_XP_FACTOR : 1;

export interface GradeResult {
  correct: boolean;
  /** Respuesta sin contestar (no se puede comprobar). */
  empty: boolean;
  /** Para opciones: la elegida por error, para mostrar su wrongExplanation. */
  wrongChoice?: number;
  /** Número interpretado en numeric_input. */
  parsed?: number | null;
  /** Elementos concretos mal contestados (match_pairs, categorize, fill_blank). */
  wrongItems?: string[];
}

const EMPTY: GradeResult = { correct: false, empty: true };
const ok = (extra: Partial<GradeResult> = {}): GradeResult => ({
  correct: true,
  empty: false,
  ...extra,
});
const ko = (extra: Partial<GradeResult> = {}): GradeResult => ({
  correct: false,
  empty: false,
  ...extra,
});

/** minúsculas, sin tildes, sin espacios sobrantes ni puntuación final. */
export function normalizeText(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.,;:!?]+$/g, '')
      // siglas con puntos: «O.P.V.» = «OPV»
      .replace(/(\p{L})\.(?=\p{L})/gu, '$1')
      // un artículo al principio no cambia la respuesta: «el confirming» = «confirming»
      .replace(/^(el|la|los|las|un|una|unos|unas) (?=\S)/, '')
      .trim()
  );
}

export function isEmptyAnswer(a: Answer): boolean {
  switch (a.type) {
    case 'multiple_choice':
      return a.choice === null;
    case 'multi_select':
      return a.choices.length === 0;
    case 'true_false_swipe':
      return a.value === null;
    case 'match_pairs':
      return Object.keys(a.pairs).length === 0;
    case 'fill_blank':
      return a.values.every((v) => v.trim() === '');
    case 'order_steps':
      return a.order.length === 0;
    case 'numeric_input':
      return a.text.trim() === '';
    case 'categorize':
      return Object.keys(a.assignments).length === 0;
    case 'spreadsheet':
      return Object.values(a.cells).every((v) => v.trim() === '');
    case 'build_statement':
      return Object.values(a.values).every((v) => v.trim() === '');
    case 'chart_read':
    case 'scenario':
    case 'best_argument':
      return a.choice === null;
    case 'spot_the_error':
      return a.index === null;
    case 'slider_estimate':
      return a.value === null;
    case 'case_step':
    case 'document_read':
      return a.choices.length === 0 || a.choices.some((c) => c === null);
    case 'self_explain':
      return a.text.trim() === '' || !a.revealed;
  }
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function grade(exercise: Exercise, answer: Answer): GradeResult {
  if (exercise.type !== answer.type)
    throw new Error(`Respuesta de tipo ${answer.type} para un ejercicio ${exercise.type}`);
  if (isEmptyAnswer(answer)) return EMPTY;

  switch (exercise.type) {
    case 'multiple_choice': {
      const a = answer as Extract<Answer, { type: 'multiple_choice' }>;
      return a.choice === exercise.answer ? ok() : ko({ wrongChoice: a.choice ?? undefined });
    }
    case 'multi_select': {
      const a = answer as Extract<Answer, { type: 'multi_select' }>;
      if (sameSet(a.choices, exercise.answers)) return ok();
      const wrong = a.choices.find((c) => !exercise.answers.includes(c));
      return ko({ wrongChoice: wrong });
    }
    case 'true_false_swipe': {
      const a = answer as Extract<Answer, { type: 'true_false_swipe' }>;
      return a.value === exercise.answer ? ok() : ko();
    }
    case 'match_pairs': {
      const a = answer as Extract<Answer, { type: 'match_pairs' }>;
      const wrongItems = exercise.pairs
        .filter((p) => a.pairs[p.left] !== p.right)
        .map((p) => p.left);
      return wrongItems.length ? ko({ wrongItems }) : ok();
    }
    case 'fill_blank': {
      const a = answer as Extract<Answer, { type: 'fill_blank' }>;
      const wrongItems: string[] = [];
      exercise.answers.forEach((accepted, i) => {
        const given = normalizeText(a.values[i] ?? '');
        if (!accepted.some((x) => normalizeText(x) === given)) wrongItems.push(String(i));
      });
      return wrongItems.length ? ko({ wrongItems }) : ok();
    }
    case 'order_steps': {
      const a = answer as Extract<Answer, { type: 'order_steps' }>;
      const n = exercise.steps.length;
      const correct = a.order.length === n && a.order.every((v, i) => v === i);
      return correct ? ok() : ko();
    }
    case 'numeric_input': {
      const a = answer as Extract<Answer, { type: 'numeric_input' }>;
      const parsed = parseNumber(a.text, a.locale ?? 'es');
      if (parsed === null) return ko({ parsed });
      const allowed = Math.max(
        (Math.abs(exercise.answer) * exercise.tolerance) / 100,
        Math.abs(exercise.answer) * 1e-6,
        1e-9,
      );
      return Math.abs(parsed - exercise.answer) <= allowed ? ok({ parsed }) : ko({ parsed });
    }
    case 'categorize': {
      const a = answer as Extract<Answer, { type: 'categorize' }>;
      const wrongItems = exercise.items
        .filter((i) => a.assignments[i.text] !== i.category)
        .map((i) => i.text);
      return wrongItems.length ? ko({ wrongItems }) : ok();
    }
    case 'spreadsheet': {
      const a = answer as Extract<Answer, { type: 'spreadsheet' }>;
      return gradeSpreadsheet(exercise, a.cells);
    }
    case 'build_statement': {
      const a = answer as Extract<Answer, { type: 'build_statement' }>;
      const wrongItems: string[] = [];
      exercise.sections.forEach((s, si) =>
        s.rows.forEach((r, ri) => {
          if (!r.blank) return;
          const n = parseNumber(a.values[rowKey(si, ri)] ?? '', a.locale ?? 'es');
          if (n === null || Math.abs(n - r.value) > 0.005) wrongItems.push(rowKey(si, ri));
        }),
      );
      return wrongItems.length ? ko({ wrongItems }) : ok();
    }
    case 'chart_read':
    case 'scenario':
    case 'best_argument': {
      const a = answer as Extract<Answer, { type: 'chart_read' | 'scenario' | 'best_argument' }>;
      return a.choice === exercise.answer ? ok() : ko({ wrongChoice: a.choice ?? undefined });
    }
    case 'spot_the_error': {
      const a = answer as Extract<Answer, { type: 'spot_the_error' }>;
      return a.index === exercise.errorIndex ? ok() : ko({ wrongItems: [String(a.index)] });
    }
    case 'slider_estimate': {
      const a = answer as Extract<Answer, { type: 'slider_estimate' }>;
      const allowed = Math.max(
        (Math.abs(exercise.answer) * exercise.tolerance) / 100,
        Math.abs(exercise.answer) * 1e-6,
        1e-9,
      );
      return Math.abs((a.value ?? NaN) - exercise.answer) <= allowed
        ? ok({ parsed: a.value })
        : ko({ parsed: a.value });
    }
    case 'case_step': {
      const a = answer as Extract<Answer, { type: 'case_step' }>;
      const wrongItems = exercise.steps
        .map((st, i) => (a.choices[i] === st.answer ? null : String(i)))
        .filter((x): x is string => x !== null);
      return wrongItems.length ? ko({ wrongItems }) : ok();
    }
    case 'document_read': {
      const a = answer as Extract<Answer, { type: 'document_read' }>;
      const wrongItems = exercise.questions
        .map((q, i) => (a.choices[i] === q.answer ? null : String(i)))
        .filter((x): x is string => x !== null);
      return wrongItems.length ? ko({ wrongItems }) : ok();
    }
    case 'self_explain': {
      const a = answer as Extract<Answer, { type: 'self_explain' }>;
      return a.rubric.filter(Boolean).length >= SELF_EXPLAIN_PASS ? ok() : ko();
    }
    default:
      throw new Error(`Tipo de ejercicio sin corrector todavía: ${(exercise as Exercise).type}`);
  }
}

/** Explicación a mostrar: la específica de la opción elegida (si hay) + la general. */
export function feedbackText(exercise: Exercise, result: GradeResult): string {
  const w = 'wrongExplanations' in exercise ? exercise.wrongExplanations : undefined;
  if (exercise.type === 'best_argument' && result.correct) {
    const others = Object.entries(exercise.wrongExplanations)
      .map(([i, why]) => `«${exercise.options[Number(i)]}»: ${why}`)
      .join(' ');
    return `${exercise.explanation} Por qué fallan los demás. ${others}`;
  }
  const specific = result.wrongChoice !== undefined ? w?.[String(result.wrongChoice)] : undefined;
  return specific ? `${specific} ${exercise.explanation}` : exercise.explanation;
}

/** Barajado determinista por semilla (Fisher-Yates): el mismo ejercicio se baraja igual en cada dispositivo. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = mulberry32(h >>> 0);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Orden inicial barajado que nunca coincide con la solución (si hay >1 paso). */
export function shuffledOrder(exercise: Of<'order_steps'>): number[] {
  const idx = exercise.steps.map((_, i) => i);
  for (let salt = 0; salt < 20; salt++) {
    const s = seededShuffle(idx, `${exercise.id}#${salt}`);
    if (s.some((v, i) => v !== i)) return s;
  }
  return [...idx].reverse();
}
