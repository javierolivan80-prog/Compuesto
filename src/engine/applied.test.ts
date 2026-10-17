import { describe, expect, it } from 'vitest';
import { exerciseSchema, type Exercise } from '../content/schemas';
import { chartFacts, chartSeries, describeSeries } from './charts';
import {
  initialCase,
  chooseOption,
  isCaseComplete,
  nextStep,
  parseSavedCase,
  revealStep,
} from './case-step';
import { SELF_EXPLAIN_XP_FACTOR, grade, isEmptyAnswer, xpFactor, type Answer } from './grading';

const common = {
  id: 'n1-u1-l1-e1',
  difficulty: 2,
  bloom: 'aplicar',
  tags: [],
  concepts: ['interes-compuesto'],
  explanation: 'Explicación general.',
};
const mk = (x: object): Exercise => exerciseSchema.parse({ ...common, ...x });
const opts = ['A', 'B', 'C'];

describe('charts: series con semilla', () => {
  const kinds = ['price', 'line', 'bars', 'yield_curve'] as const;
  it.each(kinds)('%s: la misma semilla da el mismo gráfico y otra semilla, otro', (kind) => {
    const a = chartSeries({ kind, seed: 7, points: 10 });
    expect(chartSeries({ kind, seed: 7, points: 10 })).toEqual(a);
    expect(chartSeries({ kind, seed: 8, points: 10 }).values).not.toEqual(a.values);
    expect(a.values.every(Number.isFinite)).toBe(true);
    expect(a.labels).toHaveLength(a.values.length);
  });
  it('hechos y descripción textual', () => {
    const s = { kind: 'line', labels: ['a', 'b', 'c'], values: [10, 30, 20], unit: '' } as const;
    const f = chartFacts({ ...s, labels: [...s.labels], values: [...s.values] });
    expect(f).toMatchObject({ first: 10, last: 20, changePct: 100, maxIndex: 1, minIndex: 0 });
    expect(f.nonDecreasing).toBe(false);
    expect(describeSeries({ ...s, labels: [...s.labels], values: [...s.values] })).toContain(
      'Máximo 30 en b',
    );
  });
  it('la curva de tipos da 11 puntos como máximo y precio parte de 100', () => {
    expect(chartSeries({ kind: 'yield_curve', seed: 1, points: 50 }).values).toHaveLength(11);
    expect(chartSeries({ kind: 'price', seed: 1, points: 20 }).values[0]).toBe(100);
  });
});

describe('chart_read / scenario / best_argument', () => {
  const chart = mk({
    type: 'chart_read',
    prompt: '¿?',
    chart: { kind: 'line', seed: 3, points: 8 },
    options: opts,
    answer: 1,
    altText: 'Gráfico.',
    truth: { metric: 'maxIndex', value: 0 },
    wrongExplanations: { '0': 'x', '2': 'y' },
  });
  const scenario = mk({
    type: 'scenario',
    situation: 'S',
    prompt: '¿?',
    options: opts,
    answer: 2,
  });
  const arg = mk({
    type: 'best_argument',
    claim: 'C',
    options: opts,
    answer: 0,
    wrongExplanations: { '1': 'a', '2': 'b' },
  });
  it.each([
    [chart, 'chart_read', 1],
    [scenario, 'scenario', 2],
    [arg, 'best_argument', 0],
  ] as const)('%#: acierta, falla y vacío', (e, type, right) => {
    const a = (choice: number | null) => ({ type, choice }) as Answer;
    expect(grade(e, a(right)).correct).toBe(true);
    const wrongChoice = right === 0 ? 1 : 0;
    expect(grade(e, a(wrongChoice))).toMatchObject({ correct: false, wrongChoice });
    expect(grade(e, a(null)).empty).toBe(true);
  });
});

describe('spot_the_error', () => {
  const e = mk({ type: 'spot_the_error', prompt: '¿?', lines: ['a', 'b', 'c'], errorIndex: 1 });
  it('acierta la línea con el error', () => {
    expect(grade(e, { type: 'spot_the_error', index: 1 }).correct).toBe(true);
    expect(grade(e, { type: 'spot_the_error', index: 0 }).correct).toBe(false);
    expect(isEmptyAnswer({ type: 'spot_the_error', index: null })).toBe(true);
  });
});

describe('slider_estimate', () => {
  const e = mk({
    type: 'slider_estimate',
    prompt: '¿?',
    min: 0,
    max: 100,
    step: 1,
    answer: 50,
    tolerance: 10,
  });
  it('acepta el margen relativo y rechaza fuera de él', () => {
    const v = (value: number | null) => grade(e, { type: 'slider_estimate', value });
    expect(v(50).correct).toBe(true);
    expect(v(45).correct).toBe(true);
    expect(v(55).correct).toBe(true);
    expect(v(56).correct).toBe(false);
    expect(v(44).correct).toBe(false);
    expect(v(null).empty).toBe(true);
  });
});

describe('case_step y document_read', () => {
  const step = { prompt: 'P', options: opts, explanation: 'E' };
  const cs = mk({
    type: 'case_step',
    caseId: 'naranjas',
    intro: 'Caso',
    steps: [
      { ...step, answer: 0 },
      { ...step, answer: 2 },
    ],
  });
  const dr = mk({
    type: 'document_read',
    excerpt: 'Texto.',
    source: 'https://www.cnmv.es/',
    documentDate: '2025-01-01',
    questions: [
      { prompt: 'P1', options: opts, answer: 1 },
      { prompt: 'P2', options: opts, answer: 0 },
    ],
  });
  it('exige todos los pasos contestados y señala los fallados', () => {
    expect(grade(cs, { type: 'case_step', choices: [0, null] }).empty).toBe(true);
    expect(grade(cs, { type: 'case_step', choices: [0, 2] }).correct).toBe(true);
    expect(grade(cs, { type: 'case_step', choices: [1, 2] })).toMatchObject({
      correct: false,
      wrongItems: ['0'],
    });
    expect(grade(dr, { type: 'document_read', choices: [1, 0] }).correct).toBe(true);
    expect(grade(dr, { type: 'document_read', choices: [1, 1] }).wrongItems).toEqual(['1']);
    expect(grade(dr, { type: 'document_read', choices: [null, null] }).empty).toBe(true);
  });
});

describe('estado del caso (reanudación)', () => {
  it('avanza paso a paso y solo tras comprobar', () => {
    let s = initialCase(3);
    expect(revealStep(s)).toBe(s); // sin elegir no se comprueba
    s = chooseOption(s, 2);
    expect(nextStep(s)).toBe(s); // sin comprobar no avanza
    s = revealStep(s);
    expect(chooseOption(s, 0).choices[0]).toBe(2); // comprobado: no se cambia
    s = nextStep(s);
    expect(s).toMatchObject({ step: 1, revealed: false });
    s = revealStep(chooseOption(s, 1));
    s = revealStep(chooseOption(nextStep(s), 0));
    expect(isCaseComplete(s)).toBe(true);
    expect(nextStep(s)).toBe(s);
  });
  it('un estado guardado se reanuda y uno corrupto se descarta', () => {
    let s = revealStep(chooseOption(initialCase(3), 1));
    s = nextStep(s);
    expect(parseSavedCase(JSON.stringify(s), 3)).toEqual(s);
    expect(parseSavedCase(JSON.stringify(s), 4)).toBeNull(); // otra versión del caso
    expect(parseSavedCase('{"choices":[null,null,null],"step":5,"revealed":false}', 3)).toBeNull();
    expect(parseSavedCase('{"choices":[null,1,null],"step":1,"revealed":false}', 3)).toBeNull();
    expect(parseSavedCase('no es json', 3)).toBeNull();
    expect(parseSavedCase(null, 3)).toBeNull();
  });
});

describe('self_explain', () => {
  const e = mk({
    type: 'self_explain',
    prompt: 'Explica',
    modelAnswer: 'Modelo',
    rubric: ['a', 'b', 'c'],
  });
  const a = (rubric: [boolean, boolean, boolean], revealed = true, text = 'mi texto'): Answer => ({
    type: 'self_explain',
    text,
    revealed,
    rubric,
  });
  it('no se comprueba sin texto ni sin haber visto la respuesta modelo', () => {
    expect(isEmptyAnswer(a([true, true, true], false))).toBe(true);
    expect(isEmptyAnswer(a([true, true, true], true, '  '))).toBe(true);
  });
  it('vale con 2 de 3 criterios y da la mitad de XP', () => {
    expect(grade(e, a([true, true, false])).correct).toBe(true);
    expect(grade(e, a([true, false, false])).correct).toBe(false);
    expect(xpFactor(e)).toBe(SELF_EXPLAIN_XP_FACTOR);
    expect(
      xpFactor(mk({ type: 'scenario', situation: 'S', prompt: 'P', options: opts, answer: 0 })),
    ).toBe(1);
  });
});
