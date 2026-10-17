import { describe, expect, it } from 'vitest';
import { exerciseSchema, type Exercise } from '../content/schemas';
import { grade } from './grading';
import {
  fillFormula,
  fillText,
  generateValues,
  gridSize,
  instantiate,
  isParametric,
  markersOf,
  onGrid,
  seedFrom,
  templateStrings,
  variantSeedFor,
} from './params';
import { rowKey } from './statement';

const parse = (x: unknown) => exerciseSchema.parse(x);
const base = {
  difficulty: 2,
  bloom: 'aplicar',
  concepts: ['interes-compuesto'],
};

const numeric = parse({
  ...base,
  id: 'p-num',
  type: 'numeric_input',
  prompt: 'Depositas {capital} € al {tipo} % anual durante {anos} años. ¿Cuánto tendrás?',
  answer: 1102.5,
  unit: '€',
  tolerance: 0,
  formula: '{capital} * (1 + {tipo}/100)^{anos}',
  params: {
    capital: { value: 1000, min: 500, max: 5000, step: 500 },
    tipo: { value: 5, min: 2, max: 8, step: 0.5, decimals: 1 },
    anos: { value: 2, min: 2, max: 5, step: 1 },
  },
  derived: { intereses: { formula: '{capital} * (1 + {tipo}/100)^{anos} - {capital}' } },
  explanation: 'Ganas {intereses} € de intereses: tendrás {answer} €.',
  hint: 'Multiplica {capital} por (1 + {tipo} %) {anos} veces.',
});

const sheet = parse({
  ...base,
  id: 'p-sheet',
  type: 'spreadsheet',
  prompt: 'Calcula el total con IVA de {precio} €.',
  cells: { A1: 'Precio ({precio} €)', B1: '{precio}', B2: '={precio}*0+21' },
  target: 'B3',
  solution: '=B1*(1+B2/100)',
  expected: 121,
  params: { precio: { value: 100, min: 50, max: 300, step: 10 } },
  hiddenCases: [{ set: { B2: 10 }, expected: 110 }],
  explanation: 'Total = precio × 1,21.',
});

const statement = parse({
  ...base,
  id: 'p-bs',
  type: 'build_statement',
  statement: 'balance',
  prompt: 'Completa el balance con caja de {caja}.',
  params: { caja: { value: 100, min: 50, max: 200, step: 10 } },
  sections: [
    {
      name: 'Activo',
      side: 'activo',
      rows: [
        { label: 'Caja', value: 100, formula: '{caja}' },
        { label: 'Inmovilizado', value: 400 },
      ],
    },
    {
      name: 'Patrimonio',
      side: 'patrimonio',
      rows: [{ label: 'Capital', value: 500, blank: true, formula: '{caja} + 400' }],
    },
  ],
  explanation: 'El patrimonio cuadra el balance.',
});

describe('utilidades', () => {
  it('markersOf, seedFrom y semilla de variante', () => {
    expect(markersOf('a {x} b {y} {x}')).toEqual(['x', 'y']);
    expect(seedFrom('a')).toBe(seedFrom('a'));
    expect(seedFrom('a')).not.toBe(seedFrom('b'));
    expect(variantSeedFor('e1', '2026-10-17')).toBe('e1#2026-10-17');
  });
  it('rejilla', () => {
    const p = { value: 1, min: 0, max: 1, step: 0.25, decimals: 2 };
    expect(gridSize(p)).toBe(4);
    expect(onGrid(p, 0.5)).toBe(true);
    expect(onGrid(p, 0.3)).toBe(false);
    expect(onGrid(p, 1.25)).toBe(false);
  });
  it('fillText con formato español y fillFormula con paréntesis; marcador desconocido = error', () => {
    expect(fillText('{x} €', { x: 1234.5 }, { x: [2, 2] })).toBe('1.234,50 €');
    expect(fillFormula('{x}*2', { x: -3 })).toBe('(-3)*2');
    expect(() => fillText('{y}', {}, {})).toThrow(/sin definir/);
    expect(() => fillFormula('{y}', {})).toThrow(/sin definir/);
  });
});

describe('generateValues', () => {
  const params = isParametric(numeric) ? numeric.params! : {};
  it('misma semilla → mismas cifras; distinta semilla → normalmente distintas', () => {
    expect(generateValues(params, 's1')).toEqual(generateValues(params, 's1'));
    const seen = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(generateValues(params, `s${i}`))),
    );
    expect(seen.size).toBeGreaterThan(10);
  });
  it('dentro de rango, en la rejilla y con sus decimales; nunca igual al enunciado', () => {
    for (let i = 0; i < 200; i++) {
      const v = generateValues(params, `r${i}`);
      for (const [k, p] of Object.entries(params)) {
        expect(onGrid(p, v[k]!), `${k}=${v[k]}`).toBe(true);
        expect(Number(v[k]!.toFixed(p.decimals))).toBe(v[k]);
      }
      expect(Object.keys(params).some((k) => v[k] !== params[k]!.value)).toBe(true);
    }
  });
  it('si solo cabe el valor del enunciado, lo devuelve tras agotar los sorteos', () => {
    expect(
      generateValues({ x: { value: 1, min: 1, max: 1.5, step: 1, decimals: 0 } }, 's'),
    ).toEqual({
      x: 1,
    });
  });
});

describe('instantiate', () => {
  it('sin params devuelve el mismo objeto y sin cifras', () => {
    const plain = parse({
      ...base,
      id: 'x',
      type: 'true_false_swipe',
      statement: 'Sí',
      answer: true,
      explanation: 'Sí.',
    });
    expect(instantiate(plain)).toEqual({ exercise: plain, values: null });
    expect(instantiate(plain, 'seed').exercise).toBe(plain);
  });

  it('numeric_input sin semilla: cifras del enunciado y respuesta declarada', () => {
    const r = instantiate(numeric);
    const e = r.exercise as Extract<Exercise, { type: 'numeric_input' }>;
    expect(r.values).toEqual({ capital: 1000, tipo: 5, anos: 2 });
    expect(e.prompt).toBe('Depositas 1.000 € al 5 % anual durante 2 años. ¿Cuánto tendrás?');
    expect(e.answer).toBe(1102.5);
    expect(e.explanation).toBe('Ganas 102,50 € de intereses: tendrás 1.102,50 €.');
    expect(e.hint).toBe('Multiplica 1.000 por (1 + 5 %) 2 veces.');
    expect(isParametric(e)).toBe(false);
  });

  it('numeric_input con semilla: respuesta recalculada y redondeada; la del enunciado ya no vale', () => {
    const r = instantiate(numeric, 'repaso#1');
    const v = r.values!;
    const e = r.exercise as Extract<Exercise, { type: 'numeric_input' }>;
    const exact = v.capital! * (1 + v.tipo! / 100) ** v.anos!;
    expect(e.answer).toBe(Math.round(exact * 100) / 100);
    expect(
      grade(e, { type: 'numeric_input', text: String(e.answer).replace('.', ',') }).correct,
    ).toBe(true);
    if (Math.abs(e.answer - 1102.5) > 0.01)
      expect(grade(e, { type: 'numeric_input', text: '1102,5' }).correct).toBe(false);
    expect(e.prompt).not.toMatch(/\{/);
    expect(instantiate(e, 'otra').exercise).toBe(e); // concreto: idempotente
  });

  it('answerDecimals se respeta en la variante', () => {
    const t = parse({ ...numeric, answerDecimals: 0 });
    const e = instantiate(t, 'x').exercise as Extract<Exercise, { type: 'numeric_input' }>;
    expect(Number.isInteger(e.answer)).toBe(true);
  });

  it('spreadsheet: celdas con la cifra, texto con formato y expected/casos ocultos recalculados', () => {
    const r = instantiate(sheet, 'h#1');
    const e = r.exercise as Extract<Exercise, { type: 'spreadsheet' }>;
    const p = r.values!.precio!;
    expect(e.cells.B1).toBe(p);
    expect(e.cells.A1).toBe(
      `Precio (${p.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} €)`,
    );
    expect(e.cells.B2).toBe(`=(${p})*0+21`);
    expect(e.expected).toBeCloseTo(p * 1.21, 9);
    expect(e.hiddenCases[0]!.expected).toBeCloseTo(p * 1.1, 9);
    const sinSemilla = instantiate(sheet).exercise as Extract<Exercise, { type: 'spreadsheet' }>;
    expect(sinSemilla.expected).toBe(121);
    expect(sinSemilla.hiddenCases).toEqual([{ set: { B2: 10 }, expected: 110 }]);
  });

  it('spreadsheet: si la solución no da un número, error', () => {
    const bad = parse({ ...sheet, solution: '=A1' });
    expect(() => instantiate(bad, 's')).toThrow(/no da un número/);
  });

  it('build_statement: las filas con fórmula cambian y el balance sigue cuadrando', () => {
    const r = instantiate(statement, 'b#3');
    const e = r.exercise as Extract<Exercise, { type: 'build_statement' }>;
    const caja = r.values!.caja!;
    expect(e.sections[0]!.rows[0]!.value).toBe(caja);
    expect(e.sections[0]!.rows[1]!.value).toBe(400);
    expect(e.sections[1]!.rows[0]!.value).toBe(caja + 400);
    const ok = grade(e, {
      type: 'build_statement',
      values: { [rowKey(1, 0)]: String(caja + 400) },
    });
    expect(ok.correct).toBe(true);
    const sinSemilla = instantiate(statement).exercise as Extract<
      Exercise,
      { type: 'build_statement' }
    >;
    expect(sinSemilla.sections[1]!.rows[0]!.value).toBe(500);
  });

  it('templateStrings recoge textos y fórmulas de los tres tipos', () => {
    const n = templateStrings(numeric as never);
    expect(n.formulas).toContain('{capital} * (1 + {tipo}/100)^{anos}');
    expect(n.texts).toContain('€');
    expect(templateStrings(sheet as never).formulas).toContain('{precio}');
    expect(templateStrings(statement as never).formulas).toContain('{caja} + 400');
    expect(templateStrings(statement as never).texts).toContain('Caja');
  });
});
