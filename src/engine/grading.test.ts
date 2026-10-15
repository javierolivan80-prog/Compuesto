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

describe('spreadsheet (corrección por resultado)', () => {
  const ss = mk({
    type: 'spreadsheet',
    prompt: 'Calcula el total con comisión.',
    cells: { A1: 1000, A2: 0.001 },
    target: 'A3',
    solution: 'A1 * (1 + A2)',
    expected: 1001,
    tolerance: 0,
    hiddenCases: [{ set: { A1: 2000 }, expected: 2002 }],
  });
  const answer = (text: string): Answer => ({ type: 'spreadsheet', cells: { A3: text } });

  it('acepta cualquier fórmula que dé el resultado, no solo el texto de la solución', () => {
    expect(grade(ss, answer('=A1*(1+A2)')).correct).toBe(true);
    expect(grade(ss, answer('=A1+A1*A2')).correct).toBe(true);
    expect(grade(ss, answer('=A1+A2*A1')).correct).toBe(true);
  });
  it('rechaza un número tecleado a mano aunque sea el resultado (se exige fórmula)', () => {
    expect(grade(ss, answer('1001'))).toMatchObject({
      correct: false,
      empty: false,
      wrongItems: ['A3'],
    });
  });
  it('rechaza una fórmula que solo funciona con los datos visibles (casos ocultos)', () => {
    expect(grade(ss, answer('=1000*1.001')).correct).toBe(false); // da 1001 pero no generaliza a A1 = 2000
    expect(grade(ss, answer('=A1+1')).correct).toBe(false); // da 1001, pero con A1 = 2000 da 2001 ≠ 2002
  });
  it('un error de fórmula (#DIV/0!, #REF!, sintaxis) es incorrecto, no excepción', () => {
    for (const f of ['=A1/0', '=ZZ+', '=FOO(A1)', '=A3'])
      expect(grade(ss, answer(f)).correct, f).toBe(false);
  });
  it('vacío si la celda editable no se ha escrito', () => {
    expect(grade(ss, answer('  ')).empty).toBe(true);
    expect(isEmptyAnswer({ type: 'spreadsheet', cells: {} })).toBe(true);
  });
  it('solo cuentan las celdas editables: no se puede cambiar un dato de entrada', () => {
    const cheat: Answer = { type: 'spreadsheet', cells: { A1: '1', A3: '=A1*(1+A2)' } };
    expect(grade(ss, cheat).correct).toBe(true); // A1 escrito se ignora: sigue valiendo 1000
    expect(grade(ss, { type: 'spreadsheet', cells: { A1: '1', A3: '=A1' } }).correct).toBe(false);
  });
  it('tolerancia relativa', () => {
    const t = mk({
      type: 'spreadsheet',
      prompt: 'Divide.',
      cells: { A1: 1000 },
      target: 'B1',
      solution: 'A1/3',
      expected: 333.33,
      tolerance: 0.01,
    });
    expect(grade(t, { type: 'spreadsheet', cells: { B1: '=A1/3' } }).correct).toBe(true);
    expect(grade(t, { type: 'spreadsheet', cells: { B1: '=A1/4' } }).correct).toBe(false);
  });
});

describe('build_statement (rellenar hasta que cuadre)', () => {
  const bs = mk({
    type: 'build_statement',
    statement: 'balance',
    prompt: 'Cuadra el balance.',
    sections: [
      {
        name: 'Activo',
        side: 'activo',
        rows: [
          { label: 'Caja', value: 100, blank: true },
          { label: 'Clientes', value: 50 },
        ],
      },
      { name: 'Pasivo', side: 'pasivo', rows: [{ label: 'Deuda', value: 60 }] },
      {
        name: 'Patrimonio',
        side: 'patrimonio',
        rows: [
          { label: 'Capital', value: 40, blank: true },
          { label: 'Reservas', value: 50 },
        ],
      },
    ],
  });
  const fill = (v: Record<string, string>): Answer => ({ type: 'build_statement', values: v });

  it('acierta con todos los huecos correctos (admite coma decimal y separador de miles)', () => {
    expect(grade(bs, fill({ '0.0': '100', '2.0': '40' })).correct).toBe(true);
    expect(grade(bs, fill({ '0.0': '100,00', '2.0': '40,0' })).correct).toBe(true);
  });
  it('señala qué huecos fallan, y un hueco vacío cuenta como fallo', () => {
    expect(grade(bs, fill({ '0.0': '90', '2.0': '40' }))).toMatchObject({
      correct: false,
      wrongItems: ['0.0'],
    });
    expect(grade(bs, fill({ '0.0': '100' }))).toMatchObject({
      correct: false,
      wrongItems: ['2.0'],
    });
    expect(grade(bs, fill({ '0.0': 'cien', '2.0': '40' })).wrongItems).toEqual(['0.0']);
  });
  it('vacío cuando no se ha escrito nada', () => {
    expect(grade(bs, fill({})).empty).toBe(true);
    expect(grade(bs, fill({ '0.0': ' ' })).empty).toBe(true);
  });
});
