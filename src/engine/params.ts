import type { Exercise, ParamSpec } from '../content/schemas';
import { evaluateNumber } from './expr';
import { mulberry32 } from './prng';
import { evaluateSheet, numericValue, type CellInput } from './sheet';

/*
 * Ejercicios paramétricos (TEMARIO §6, tarea 2.9). `instantiate` convierte una plantilla con `params` en un
 * ejercicio concreto del mismo tipo: sin semilla, con las cifras del enunciado; con semilla, con cifras nuevas.
 * Las vistas y `grade()` reciben siempre el ejercicio concreto. Lógica pura, sin React ni IndexedDB.
 */

export type ParametricType = 'numeric_input' | 'spreadsheet' | 'build_statement';
export type ParametricExercise = Extract<Exercise, { type: ParametricType }>;

/** Marcador de texto o fórmula: {nombre}. */
const MARKER = /\{([a-z][a-z0-9_]*)\}/g;
/** Una celda que es solo un marcador recibe el número, no texto. */
const ONLY_MARKER = /^\{([a-z][a-z0-9_]*)\}$/;
/** Respuesta de la variante de numeric_input; solo vale en explicación y pista. */
export const ANSWER_MARKER = 'answer';
/** Decimales de la respuesta de una variante si el ejercicio no indica `answerDecimals`. */
export const DEFAULT_ANSWER_DECIMALS = 2;
/** Intentos para que la variante no repita exactamente las cifras del enunciado. */
const MAX_DRAWS = 10;

export function isParametric(e: Exercise): e is ParametricExercise {
  return (
    (e.type === 'numeric_input' || e.type === 'spreadsheet' || e.type === 'build_statement') &&
    e.params !== undefined &&
    Object.keys(e.params).length > 0
  );
}

/** Nombres citados como {nombre} en un texto, sin repetir y en orden de aparición. */
export function markersOf(s: string): string[] {
  return [...new Set([...s.matchAll(MARKER)].map((m) => m[1]!))];
}

/** Semilla de la variante de un repaso: id del ejercicio + día (TEMARIO §6). Un mismo día, las mismas cifras. */
export const variantSeedFor = (exerciseId: string, day: string): string => `${exerciseId}#${day}`;

/** Hash FNV-1a de 32 bits: la semilla de texto («id#día») se convierte en número para el PRNG. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const roundTo = (v: number, decimals: number) => {
  const f = 10 ** decimals;
  const r = Math.round(v * f) / f;
  return r === 0 ? 0 : r;
};

/** Número de pasos de la rejilla [min, max] (0 si solo cabe un valor). */
export function gridSize(p: ParamSpec): number {
  return Math.max(0, Math.floor((p.max - p.min) / p.step + 1e-9));
}

/** El valor cae en [min, max] y en la rejilla min + k·paso. */
export function onGrid(p: ParamSpec, v: number): boolean {
  if (v < p.min - 1e-9 || v > p.max + 1e-9) return false;
  const k = (v - p.min) / p.step;
  return Math.abs(k - Math.round(k)) < 1e-6;
}

const baseValues = (params: Record<string, ParamSpec>) =>
  Object.fromEntries(Object.entries(params).map(([k, p]) => [k, p.value]));

/**
 * Cifras de una variante, deterministas por semilla. Si salen idénticas a las del enunciado se vuelve a sortear
 * (hasta 10 veces): el repaso debe enseñar cifras nuevas siempre que la rejilla lo permita.
 */
export function generateValues(
  params: Record<string, ParamSpec>,
  seed: string,
): Record<string, number> {
  const names = Object.keys(params).sort();
  const base = baseValues(params);
  let values: Record<string, number> = base;
  for (let draw = 0; draw < MAX_DRAWS; draw++) {
    const rnd = mulberry32(seedFrom(`${seed}#${draw}`));
    values = {};
    for (const name of names) {
      const p = params[name]!;
      const k = Math.floor(rnd() * (gridSize(p) + 1));
      values[name] = roundTo(p.min + k * p.step, p.decimals);
    }
    if (names.some((n) => values[n] !== base[n])) return values;
  }
  return values;
}

/** Decimales mínimos y máximos al escribir una cifra en el texto. */
export type Format = readonly [min: number, max: number];

const nf = ([min, max]: Format) =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    useGrouping: 'always',
  });

/**
 * Sustituye {nombre} por la cifra con formato español (1.234,56). Los datos del enunciado se escriben sin ceros
 * sobrantes («5 %»); las cifras derivadas y la respuesta, con sus decimales fijos («250,00 €»).
 * Un marcador sin valor es un error.
 */
export function fillText(
  s: string,
  scope: Record<string, number>,
  formats: Record<string, Format>,
): string {
  return s.replace(MARKER, (_, name: string) => {
    const v = scope[name];
    if (v === undefined) throw new Error(`Marcador sin definir: {${name}}`);
    return nf(formats[name] ?? [0, 0]).format(v);
  });
}

/** Sustituye {nombre} por el número entre paréntesis para el evaluador de fórmulas. */
export function fillFormula(s: string, scope: Record<string, number>): string {
  return s.replace(MARKER, (_, name: string) => {
    const v = scope[name];
    if (v === undefined) throw new Error(`Marcador sin definir: {${name}}`);
    return `(${v})`;
  });
}

function fillCell(raw: CellInput, scope: Record<string, number>, formats: Record<string, Format>) {
  if (typeof raw === 'number') return raw;
  const only = ONLY_MARKER.exec(raw.trim());
  if (only) {
    const v = scope[only[1]!];
    if (v === undefined) throw new Error(`Marcador sin definir: {${only[1]}}`);
    return v;
  }
  return raw.trim().startsWith('=') ? fillFormula(raw, scope) : fillText(raw, scope, formats);
}

const sheetValue = (cells: Record<string, CellInput>, target: string, formula: string) => {
  const v = numericValue(
    evaluateSheet({ ...cells, [target]: formula.startsWith('=') ? formula : `=${formula}` })[
      target
    ],
  );
  if (v === null) throw new Error(`La solución no da un número en ${target}`);
  return v;
};

/** El ejercicio concreto ya no es plantilla: instanciarlo otra vez lo deja igual. */
const CONCRETE = { params: undefined, derived: undefined } as const;

export interface Resolved {
  exercise: Exercise;
  /** Cifras usadas (null si el ejercicio no es paramétrico). */
  values: Record<string, number> | null;
}

/**
 * Ejercicio concreto. Sin semilla: las cifras del enunciado y las respuestas declaradas. Con semilla: cifras
 * nuevas y respuestas recalculadas con `formula`/`solution`/la fórmula de cada fila. Sin `params`: el mismo objeto.
 */
export function instantiate(
  e: Exercise,
  seed?: string,
  /** Cifras impuestas (p. ej. las de tu partida en una lección-juego); solo se usan las de parámetros declarados. */
  overrides?: Record<string, number>,
): Resolved {
  if (!isParametric(e)) return { exercise: e, values: null };
  const params = e.params!;
  const generated = seed === undefined ? baseValues(params) : generateValues(params, seed);
  const forced = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([k, v]) => k in params && Number.isFinite(v)),
  );
  const values = { ...generated, ...forced };
  const variant = seed !== undefined || Object.keys(forced).length > 0;
  const scope: Record<string, number> = { ...values };
  const formats: Record<string, Format> = Object.fromEntries(
    Object.entries(params).map(([k, p]) => [k, [p.fixed ? p.decimals : 0, p.decimals] as const]),
  );
  for (const [k, d] of Object.entries(e.derived ?? {})) {
    scope[k] = evaluateNumber(fillFormula(d.formula, scope));
    formats[k] = [d.decimals, d.decimals];
  }
  const text = (s: string) => fillText(s, scope, formats);
  const optText = (s: string | undefined) => (s === undefined ? undefined : text(s));

  switch (e.type) {
    case 'numeric_input': {
      const answerDecimals = e.answerDecimals ?? DEFAULT_ANSWER_DECIMALS;
      const formula = fillFormula(e.formula, scope);
      const answer = variant ? roundTo(evaluateNumber(formula), answerDecimals) : e.answer;
      scope[ANSWER_MARKER] = answer;
      formats[ANSWER_MARKER] = [answerDecimals, answerDecimals];
      return {
        values,
        exercise: {
          ...e,
          ...CONCRETE,
          prompt: text(e.prompt),
          unit: optText(e.unit),
          formula,
          answer,
          explanation: text(e.explanation),
          hint: optText(e.hint),
        },
      };
    }
    case 'spreadsheet': {
      const cells = Object.fromEntries(
        Object.entries(e.cells).map(([ref, raw]) => [ref, fillCell(raw, scope, formats)]),
      );
      return {
        values,
        exercise: {
          ...e,
          ...CONCRETE,
          prompt: text(e.prompt),
          cells,
          expected: variant ? sheetValue(cells, e.target, e.solution) : e.expected,
          hiddenCases: variant
            ? e.hiddenCases.map((c) => ({
                set: c.set,
                expected: sheetValue({ ...cells, ...c.set }, e.target, e.solution),
              }))
            : e.hiddenCases,
          explanation: text(e.explanation),
          hint: optText(e.hint),
        },
      };
    }
    case 'build_statement':
      return {
        values,
        exercise: {
          ...e,
          ...CONCRETE,
          prompt: text(e.prompt),
          sections: e.sections.map((s) => ({
            ...s,
            name: text(s.name),
            rows: s.rows.map((r) => ({
              ...r,
              label: text(r.label),
              value:
                variant && r.formula !== undefined
                  ? roundTo(evaluateNumber(fillFormula(r.formula, scope)), 2)
                  : r.value,
            })),
          })),
          explanation: text(e.explanation),
          hint: optText(e.hint),
        },
      };
  }
}

/** Todos los textos y fórmulas de la plantilla, para comprobar sus marcadores. */
export function templateStrings(e: ParametricExercise): { texts: string[]; formulas: string[] } {
  const texts = [e.prompt, e.explanation, ...(e.hint ? [e.hint] : [])];
  const formulas = Object.values(e.derived ?? {}).map((d) => d.formula);
  switch (e.type) {
    case 'numeric_input':
      return { texts: e.unit ? [...texts, e.unit] : texts, formulas: [...formulas, e.formula] };
    case 'spreadsheet':
      return {
        texts,
        formulas: [
          ...formulas,
          e.solution,
          ...Object.values(e.cells).filter((c): c is string => typeof c === 'string'),
        ],
      };
    case 'build_statement':
      return {
        texts: [...texts, ...e.sections.flatMap((s) => [s.name, ...s.rows.map((r) => r.label)])],
        formulas: [
          ...formulas,
          ...e.sections.flatMap((s) => s.rows.flatMap((r) => (r.formula ? [r.formula] : []))),
        ],
      };
  }
}
