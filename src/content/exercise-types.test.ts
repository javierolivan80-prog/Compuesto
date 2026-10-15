import { describe, expect, it } from 'vitest';
import { checkExercise } from './validate';
import { EXERCISE_CATEGORY, EXERCISE_TYPES, exerciseSchema } from './schemas';

const c = {
  difficulty: 2,
  bloom: 'aplicar',
  tags: [],
  concepts: ['interes-compuesto'],
  explanation: 'Porque sí, con motivo.',
};
const opts = ['A', 'B', 'C'];
const w = { '0': 'No: x.', '2': 'No: y.' };

/** Un ejemplo válido de cada uno de los 19 tipos (TEMARIO §6). */
const SAMPLES: Record<string, object> = {
  multiple_choice: {
    type: 'multiple_choice',
    prompt: '¿?',
    options: opts,
    answer: 1,
    wrongExplanations: w,
  },
  multi_select: { type: 'multi_select', prompt: '¿?', options: opts, answers: [0, 2] },
  true_false_swipe: { type: 'true_false_swipe', statement: 'Algo.', answer: true },
  match_pairs: {
    type: 'match_pairs',
    prompt: 'Une.',
    pairs: [
      { left: 'a', right: '1' },
      { left: 'b', right: '2' },
    ],
  },
  fill_blank: { type: 'fill_blank', prompt: 'El ___ compuesto.', answers: [['interés']] },
  order_steps: { type: 'order_steps', prompt: 'Ordena.', steps: ['uno', 'dos', 'tres'] },
  numeric_input: {
    type: 'numeric_input',
    prompt: 'Calcula.',
    answer: 1102.5,
    tolerance: 0,
    formula: '1000 * 1.05 ^ 2',
  },
  categorize: {
    type: 'categorize',
    prompt: 'Clasifica.',
    categories: ['Activo', 'Pasivo'],
    items: [
      { text: 'Caja', category: 'Activo' },
      { text: 'Deuda', category: 'Pasivo' },
      { text: 'Clientes', category: 'Activo' },
    ],
  },
  build_statement: {
    type: 'build_statement',
    statement: 'balance',
    prompt: 'Cuadra.',
    sections: [
      { name: 'Activo', side: 'activo', rows: [{ label: 'Caja', value: 100, blank: true }] },
      { name: 'Pasivo', side: 'pasivo', rows: [{ label: 'Deuda', value: 60 }] },
      { name: 'Patrimonio', side: 'patrimonio', rows: [{ label: 'Capital', value: 40 }] },
    ],
  },
  spreadsheet: {
    type: 'spreadsheet',
    prompt: 'Suma.',
    cells: { A1: 2, A2: 3 },
    target: 'A3',
    solution: 'SUMA(A1:A2)',
    expected: 5,
  },
  code: {
    type: 'code',
    language: 'python',
    prompt: 'Escribe f.',
    starter: 'def f(x):\n    pass',
    hiddenTests: [{ call: 'f(2)', expected: '4' }],
  },
  chart_read: {
    type: 'chart_read',
    prompt: '¿Tendencia?',
    chart: { kind: 'price', seed: 7, points: 60 },
    options: opts,
    answer: 0,
    altText: 'Gráfico de precio con tendencia alcista.',
    wrongExplanations: { '1': 'No: x.', '2': 'No: y.' },
  },
  scenario: {
    type: 'scenario',
    situation: 'Ocurre algo.',
    prompt: '¿Qué haces?',
    options: opts,
    answer: 2,
    wrongExplanations: { '0': 'No: x.', '1': 'No: y.' },
  },
  spot_the_error: {
    type: 'spot_the_error',
    prompt: 'Encuentra el error.',
    lines: ['a', 'b', 'c'],
    errorIndex: 1,
  },
  slider_estimate: {
    type: 'slider_estimate',
    prompt: '¿Cuánto?',
    min: 0,
    max: 100,
    step: 1,
    answer: 50,
    tolerance: 10,
  },
  case_step: {
    type: 'case_step',
    caseId: 'naranjas-ipo',
    intro: 'Caso.',
    steps: [
      { prompt: 'Paso 1', options: opts, answer: 0, explanation: 'x' },
      { prompt: 'Paso 2', options: opts, answer: 1, explanation: 'y' },
    ],
  },
  document_read: {
    type: 'document_read',
    excerpt: 'Texto oficial.',
    source: 'https://www.cnmv.es/',
    documentDate: '2025-01-15',
    questions: [{ prompt: '¿?', options: opts, answer: 0 }],
  },
  best_argument: {
    type: 'best_argument',
    claim: 'Afirmación.',
    options: opts,
    answer: 1,
    wrongExplanations: { '0': 'Falla: x.', '2': 'Falla: y.' },
  },
  self_explain: {
    type: 'self_explain',
    prompt: 'Explica.',
    modelAnswer: 'Respuesta modelo.',
    rubric: ['a', 'b', 'c'],
  },
};

describe('los 19 tipos de ejercicio del esquema', () => {
  it('hay un ejemplo de cada tipo', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...EXERCISE_TYPES].sort());
  });
  for (const type of EXERCISE_TYPES) {
    it(`${type}: el esquema acepta un ejemplo válido y la validación semántica no da errores`, () => {
      const parsed = exerciseSchema.safeParse({ id: 'n0-u1-l1-e1', ...c, ...SAMPLES[type] });
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      if (parsed.success) expect(checkExercise(parsed.data, true)).toEqual([]);
    });
    it(`${type}: se clasifica en reconocer/producir/aplicar`, () => {
      expect(['reconocer', 'producir', 'aplicar']).toContain(EXERCISE_CATEGORY[type]);
    });
  }
  it('reparto 4 + 7 + 8 (TEMARIO §6)', () => {
    const n = (k: string) => EXERCISE_TYPES.filter((t) => EXERCISE_CATEGORY[t] === k).length;
    expect([n('reconocer'), n('producir'), n('aplicar')]).toEqual([4, 7, 8]);
  });
  it('rechaza un ejercicio sin concepto, con dificultad fuera de rango o con tipo desconocido', () => {
    const base = { id: 'n0-u1-l1-e1', ...c, ...SAMPLES.multiple_choice };
    expect(exerciseSchema.safeParse({ ...base, concepts: [] }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, difficulty: 6 }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, type: 'quiz' }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, id: 'ID Con Espacios' }).success).toBe(false);
  });
  it('self_explain exige una rúbrica de exactamente 3 criterios', () => {
    const b = { id: 'n0-u1-l1-e1', ...c, ...SAMPLES.self_explain };
    expect(exerciseSchema.safeParse({ ...b, rubric: ['a', 'b'] }).success).toBe(false);
  });
});

describe('ejemplos de /exercises-lab', () => {
  it('pasan la validación semántica del contenido (el balance cuadra, la solución da lo esperado…)', async () => {
    const { SAMPLE_TYPES, sampleExercise } = await import('../features/exercises/samples');
    for (const t of SAMPLE_TYPES) expect(checkExercise(sampleExercise(t), true), t).toEqual([]);
  });
});
