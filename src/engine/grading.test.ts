import { describe, expect, it } from 'vitest';
import { exerciseSchema, type Exercise } from '../content/schemas';
import {
  feedbackText,
  grade,
  isEmptyAnswer,
  normalizeText,
  seededShuffle,
  shuffledOrder,
  type Answer,
} from './grading';

const common = {
  id: 'n1-u1-l1-e1',
  difficulty: 2,
  bloom: 'aplicar',
  tags: [],
  concepts: ['interes-compuesto'],
  explanation: 'Explicación general.',
};
const mk = (x: object): Exercise => exerciseSchema.parse({ ...common, ...x });

const mc = mk({
  type: 'multiple_choice',
  prompt: '¿?',
  options: ['A', 'B', 'C', 'D'],
  answer: 1,
  wrongExplanations: { '0': 'No es A.', '2': 'No es C.', '3': 'No es D.' },
});
const ms = mk({
  type: 'multi_select',
  prompt: '¿?',
  options: ['A', 'B', 'C', 'D'],
  answers: [0, 2],
});
const tf = mk({
  type: 'true_false_swipe',
  statement: 'La limitada garantiza el precio.',
  answer: true,
});
const mp = mk({
  type: 'match_pairs',
  prompt: 'Une.',
  pairs: [
    { left: 'TIN', right: 'Sin comisiones' },
    { left: 'TAE', right: 'Coste efectivo' },
    { left: 'Euríbor', right: 'Índice variable' },
  ],
});
const fb = mk({
  type: 'fill_blank',
  prompt: 'El ___ garantiza la ejecución y la ___ el precio.',
  answers: [['de mercado', 'a mercado'], ['limitada']],
});
const os = mk({ type: 'order_steps', prompt: 'Ordena.', steps: ['uno', 'dos', 'tres', 'cuatro'] });
const ni = mk({
  type: 'numeric_input',
  prompt: 'Calcula.',
  answer: 1102.5,
  tolerance: 0,
  formula: '1000 * 1.05 ^ 2',
});
const nit = mk({
  type: 'numeric_input',
  prompt: 'Calcula.',
  answer: 333.33,
  tolerance: 1,
  formula: '1000 / 3',
});
const cat = mk({
  type: 'categorize',
  prompt: 'Clasifica.',
  categories: ['Activo', 'Pasivo'],
  items: [
    { text: 'Caja', category: 'Activo' },
    { text: 'Deuda', category: 'Pasivo' },
    { text: 'Clientes', category: 'Activo' },
  ],
});

describe('multiple_choice', () => {
  it('acierta, falla (con la opción elegida) y detecta vacío', () => {
    expect(grade(mc, { type: 'multiple_choice', choice: 1 })).toEqual({
      correct: true,
      empty: false,
    });
    expect(grade(mc, { type: 'multiple_choice', choice: 2 })).toEqual({
      correct: false,
      empty: false,
      wrongChoice: 2,
    });
    expect(grade(mc, { type: 'multiple_choice', choice: null })).toEqual({
      correct: false,
      empty: true,
    });
  });
  it('usa la explicación específica de la opción elegida', () => {
    const r = grade(mc, { type: 'multiple_choice', choice: 2 });
    expect(feedbackText(mc, r)).toBe('No es C. Explicación general.');
    expect(feedbackText(mc, grade(mc, { type: 'multiple_choice', choice: 1 }))).toBe(
      'Explicación general.',
    );
  });
});

describe('multi_select', () => {
  it('exige el conjunto exacto, en cualquier orden', () => {
    expect(grade(ms, { type: 'multi_select', choices: [2, 0] }).correct).toBe(true);
    expect(grade(ms, { type: 'multi_select', choices: [0] }).correct).toBe(false); // incompleto
    expect(grade(ms, { type: 'multi_select', choices: [0, 1, 2] })).toMatchObject({
      correct: false,
      wrongChoice: 1,
    }); // de más
    expect(grade(ms, { type: 'multi_select', choices: [] }).empty).toBe(true);
  });
});

describe('true_false_swipe', () => {
  it('acierta, falla y vacío', () => {
    expect(grade(tf, { type: 'true_false_swipe', value: true }).correct).toBe(true);
    expect(grade(tf, { type: 'true_false_swipe', value: false }).correct).toBe(false);
    expect(grade(tf, { type: 'true_false_swipe', value: null }).empty).toBe(true);
  });
});

describe('match_pairs', () => {
  it('acierta con todos los pares y señala los fallados', () => {
    const all = { TIN: 'Sin comisiones', TAE: 'Coste efectivo', Euríbor: 'Índice variable' };
    expect(grade(mp, { type: 'match_pairs', pairs: all }).correct).toBe(true);
    const r = grade(mp, {
      type: 'match_pairs',
      pairs: { ...all, TAE: 'Índice variable', Euríbor: 'Coste efectivo' },
    });
    expect(r).toMatchObject({ correct: false, wrongItems: ['TAE', 'Euríbor'] });
  });
  it('un emparejamiento incompleto es incorrecto, no vacío', () => {
    expect(grade(mp, { type: 'match_pairs', pairs: { TIN: 'Sin comisiones' } })).toMatchObject({
      correct: false,
      empty: false,
    });
    expect(grade(mp, { type: 'match_pairs', pairs: {} }).empty).toBe(true);
  });
});

describe('fill_blank', () => {
  it('ignora mayúsculas, tildes, espacios y puntuación final; acepta variantes', () => {
    expect(grade(fb, { type: 'fill_blank', values: ['  De  MERCADO ', 'Limitada.'] }).correct).toBe(
      true,
    );
    expect(grade(fb, { type: 'fill_blank', values: ['a mercado', 'limitáda'] }).correct).toBe(true);
  });
  it('señala el hueco que falla', () => {
    expect(grade(fb, { type: 'fill_blank', values: ['de mercado', 'stop'] })).toMatchObject({
      correct: false,
      wrongItems: ['1'],
    });
    expect(grade(fb, { type: 'fill_blank', values: ['de mercado'] })).toMatchObject({
      correct: false,
      wrongItems: ['1'],
    });
  });
  it('vacío si todos los huecos están en blanco', () => {
    expect(grade(fb, { type: 'fill_blank', values: ['', '  '] }).empty).toBe(true);
    expect(normalizeText('  Interés, ')).toBe('interes');
  });
});

describe('order_steps', () => {
  it('solo el orden exacto acierta', () => {
    expect(grade(os, { type: 'order_steps', order: [0, 1, 2, 3] }).correct).toBe(true);
    expect(grade(os, { type: 'order_steps', order: [1, 0, 2, 3] }).correct).toBe(false);
    expect(grade(os, { type: 'order_steps', order: [0, 1, 2] }).correct).toBe(false); // incompleto
    expect(grade(os, { type: 'order_steps', order: [] }).empty).toBe(true);
  });
  it('el barajado es determinista y nunca deja la solución ya hecha', () => {
    expect(shuffledOrder(os as never)).toEqual(shuffledOrder(os as never));
    expect(shuffledOrder(os as never)).not.toEqual([0, 1, 2, 3]);
    expect([...shuffledOrder(os as never)].sort()).toEqual([0, 1, 2, 3]);
    expect(seededShuffle([1, 2, 3, 4, 5], 'a')).not.toEqual(seededShuffle([1, 2, 3, 4, 5], 'b'));
  });
});

describe('numeric_input', () => {
  it('acepta coma decimal, punto decimal y separadores de miles', () => {
    for (const text of ['1102,5', '1.102,50', '1102.5', '1 102,5', '1.102,5 €']) {
      expect(grade(ni, { type: 'numeric_input', text }), text).toMatchObject({
        correct: true,
        parsed: 1102.5,
      });
    }
  });
  it('en inglés: 1,102.50 y 1102.5', () => {
    expect(grade(ni, { type: 'numeric_input', text: '1,102.50', locale: 'en' }).correct).toBe(true);
  });
  it('respeta la tolerancia relativa', () => {
    expect(grade(nit, { type: 'numeric_input', text: '333,33' }).correct).toBe(true);
    expect(grade(nit, { type: 'numeric_input', text: '335' }).correct).toBe(true); // 0,5 %
    expect(grade(nit, { type: 'numeric_input', text: '340' }).correct).toBe(false); // 2 %
    expect(grade(ni, { type: 'numeric_input', text: '1102,4' }).correct).toBe(false); // exacto
  });
  it('vacío y texto no numérico', () => {
    expect(grade(ni, { type: 'numeric_input', text: '   ' }).empty).toBe(true);
    expect(grade(ni, { type: 'numeric_input', text: 'mil' })).toMatchObject({
      correct: false,
      empty: false,
      parsed: null,
    });
  });
});

describe('categorize', () => {
  const all = { Caja: 'Activo', Deuda: 'Pasivo', Clientes: 'Activo' };
  it('acierta con todo bien y señala lo fallado', () => {
    expect(grade(cat, { type: 'categorize', assignments: all }).correct).toBe(true);
    expect(
      grade(cat, { type: 'categorize', assignments: { ...all, Deuda: 'Activo' } }),
    ).toMatchObject({ correct: false, wrongItems: ['Deuda'] });
    expect(grade(cat, { type: 'categorize', assignments: { Caja: 'Activo' } })).toMatchObject({
      correct: false,
      wrongItems: ['Deuda', 'Clientes'],
    });
    expect(grade(cat, { type: 'categorize', assignments: {} }).empty).toBe(true);
  });
});

describe('guardas', () => {
  it('lanza si la respuesta no es del tipo del ejercicio', () => {
    expect(() => grade(mc, { type: 'true_false_swipe', value: true })).toThrow(/true_false_swipe/);
  });
  it('isEmptyAnswer cubre todos los tipos', () => {
    const empties: Answer[] = [
      { type: 'multiple_choice', choice: null },
      { type: 'multi_select', choices: [] },
      { type: 'true_false_swipe', value: null },
      { type: 'match_pairs', pairs: {} },
      { type: 'fill_blank', values: [''] },
      { type: 'order_steps', order: [] },
      { type: 'numeric_input', text: '' },
      { type: 'categorize', assignments: {} },
    ];
    expect(empties.every(isEmptyAnswer)).toBe(true);
  });
});
