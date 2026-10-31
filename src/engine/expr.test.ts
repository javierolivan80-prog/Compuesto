import { describe, expect, it } from 'vitest';
import {
  ERROR_LABELS,
  evaluate,
  evaluateNumber,
  ExprError,
  expandRange,
  irr,
  type Value,
} from './expr';

describe('evaluador de fórmulas', () => {
  it('aritmética con precedencia y paréntesis', () => {
    expect(evaluateNumber('1 + 2 * 3')).toBe(7);
    expect(evaluateNumber('(1 + 2) * 3')).toBe(9);
    expect(evaluateNumber('2 ^ 3 ^ 2')).toBe(512); // derecha
    expect(evaluateNumber('-2 ^ 2')).toBe(4); // unario antes que ^ (como Excel)
    expect(evaluateNumber('10 / 4')).toBe(2.5);
    expect(evaluateNumber('50%')).toBe(0.5);
  });
  it('fórmula del ejemplo de TEMARIO §7', () => {
    expect(evaluateNumber('100 * 10 * (1 + 0.001)')).toBeCloseTo(1001, 9);
    expect(evaluateNumber('1000 * (1 + 0.05) ^ 2')).toBeCloseTo(1102.5, 9);
  });
  it('funciones en inglés y en español', () => {
    expect(evaluateNumber('SUM(1, 2, 3)')).toBe(6);
    expect(evaluateNumber('suma(1; 2)'.replace(';', ','))).toBe(3);
    expect(evaluateNumber('PROMEDIO(2, 4, 6)')).toBe(4);
    expect(evaluateNumber('MAX(1, 9, 3) - MIN(4, 2)')).toBe(7);
    expect(evaluateNumber('ROUND(2.345, 2)')).toBe(2.35);
    expect(evaluateNumber('SQRT(16) + LN(EXP(2))')).toBeCloseTo(6, 9);
    expect(evaluateNumber('VF(1000, 0.05, 2)')).toBeCloseTo(1102.5, 9);
    expect(evaluateNumber('VNA(0.1, 110, 121)')).toBeCloseTo(200, 9);
  });
  it('condicionales y comparaciones', () => {
    expect(evaluateNumber('IF(3 > 2, 10, 20)')).toBe(10);
    expect(evaluateNumber('SI(1 = 2, 10, 20)')).toBe(20);
    expect(evaluate('2 <> 3')).toBe(true);
  });
  it('referencias y rangos', () => {
    const cells: Record<string, number> = { A1: 10, A2: 20, B1: 5, B2: 5 };
    const env = { get: (n: string) => cells[n] };
    expect(evaluateNumber('A1 + A2', env)).toBe(30);
    expect(evaluateNumber('SUMA(A1:B2)', env)).toBe(40);
    expect(evaluateNumber('PROMEDIO(A1:A2) * 2', env)).toBe(30);
    expect(expandRange('A1', 'B2')).toEqual(['A1', 'A2', 'B1', 'B2']);
  });
  it('errores claros: división por cero, referencia, función, sintaxis', () => {
    expect(() => evaluate('1 / 0')).toThrow(/División por cero/);
    expect(() => evaluate('Z9 + 1')).toThrow(/Referencia desconocida/);
    expect(() => evaluate('FOO(1)')).toThrow(/Función desconocida/);
    expect(() => evaluate('1 +')).toThrow(ExprError);
    expect(() => evaluate('(1 + 2')).toThrow(/Se esperaba/);
    expect(() => evaluate('1 2')).toThrow(/Sobra texto/);
    expect(() => evaluate('LN(0)')).toThrow(/LN/);
    expect(() => evaluateNumber('"a"')).toThrow(/número finito/);
  });
  it('no ejecuta código: no hay acceso a nada fuera del lenguaje', () => {
    expect(() => evaluate('process.exit(1)')).toThrow();
    expect(() => evaluate('constructor')).toThrow(/Referencia desconocida/);
  });
});

describe('BUSCARX (n5-u6)', () => {
  const cells: Record<string, Value> = {
    A1: 'NAR',
    A2: 'PIR',
    A3: 'MED',
    B1: 120,
    B2: -80,
    B3: 45,
  };
  const env = { get: (n: string) => cells[n] };
  it('busca por coincidencia exacta, sin distinguir mayúsculas, en inglés y en español', () => {
    expect(evaluate('XLOOKUP("PIR", A1:A3, B1:B3)', env)).toBe(-80);
    expect(evaluate('BUSCARX("med";A1:A3;B1:B3)', env)).toBe(45);
  });
  it('si no lo encuentra, devuelve el cuarto argumento o el error #N/A', () => {
    expect(evaluate('BUSCARX("TRA"; A1:A3; B1:B3; 0)', env)).toBe(0);
    expect(() => evaluate('BUSCARX("TRA"; A1:A3; B1:B3)', env)).toThrow(/no encuentra/);
  });
  it('los dos rangos deben ser del mismo tamaño', () => {
    expect(() => evaluate('BUSCARX("NAR"; A1:A3; B1:B2)', env)).toThrow(/mismo tamaño/);
  });
});

describe('TIR, VNA y códigos de error (tarea 1.5)', () => {
  // Valores de referencia calculados aparte con bisección en aritmética decimal de 50 dígitos.
  const IRR_REFERENCE: [string, number[], number][] = [
    ['dos flujos', [-100, 110], 0.1],
    ['tres años 1.331', [-1000, 0, 0, 1331], 0.1],
    ['anualidad 500 × 3', [-1000, 500, 500, 500], 0.233751928528],
    ['anualidad 400 × 3', [-1000, 400, 400, 400], 0.097010257403],
    ['proyecto de 5 años', [-5000, 1200, 1500, 1800, 2000, 1000], 0.150157501084],
    ['TIR negativa', [-1000, 300, 300, 300], -0.050885441373],
    ['tasa alta', [-100, 50, 100, 150], 0.653456599861],
    ['diez periodos', [-10000, ...Array(10).fill(1500)], 0.081441656464],
  ];
  it.each(IRR_REFERENCE)('TIR de %s coincide con la referencia', (_name, flows, expected) => {
    expect(irr(flows)).toBeCloseTo(expected, 9);
  });
  it('la TIR anula el VAN (comprobación independiente de la referencia)', () => {
    for (const [, flows] of IRR_REFERENCE) {
      const r = irr(flows);
      const npv = flows.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i), 0);
      expect(Math.abs(npv)).toBeLessThan(1e-6);
    }
  });
  it('con varias TIR devuelve la más cercana a la estimación', () => {
    const flows = [-100, 230, -132]; // raíces exactas: 10 % y 20 %
    expect(irr(flows, 0.12)).toBeCloseTo(0.1, 9);
    expect(irr(flows, 0.18)).toBeCloseTo(0.2, 9);
  });
  it('sin solución: todos los flujos con el mismo signo, o menos de dos', () => {
    expect(() => irr([100, 200, 300])).toThrow(/al menos un flujo positivo y otro negativo/);
    expect(() => irr([-100, -50])).toThrow(ExprError);
    expect(() => irr([-100])).toThrow(ExprError);
    try {
      irr([100, 200]);
    } catch (e) {
      expect((e as ExprError).code).toBe('#NUM!');
    }
  });
  it('TIR y VNA como funciones de hoja, con rangos y en español', () => {
    const cells: Record<string, number> = { A1: -1000, A2: 400, A3: 400, A4: 400 };
    const env = { get: (n: string) => cells[n] };
    expect(evaluateNumber('TIR(A1:A4)', env)).toBeCloseTo(0.097010257403, 9);
    expect(evaluateNumber('IRR(A1:A4)', env)).toBeCloseTo(0.097010257403, 9);
    expect(evaluateNumber('TIR(A1:A4; 0,5)', env)).toBeCloseTo(0.097010257403, 9);
    expect(evaluateNumber('VNA(0,1; 110; 121)')).toBeCloseTo(200, 9);
    expect(evaluateNumber('VNA(0.1, A2:A4) + A1', env)).toBeCloseTo(-5.2592, 3);
  });
  it('separador ; y coma decimal como en Excel en español', () => {
    expect(evaluateNumber('SUMA(1,5; 2,5)')).toBe(4);
    expect(evaluateNumber('SI(2 > 1; 10,5; 20)')).toBe(10.5);
    expect(evaluateNumber('PROMEDIO(1; 2; 3)')).toBe(2);
  });
  it('cada error tiene su código tipo Excel y un mensaje en español', () => {
    const code = (src: string) => {
      try {
        evaluate(src);
        return 'ok';
      } catch (e) {
        return (e as ExprError).code;
      }
    };
    expect(code('1 / 0')).toBe('#DIV/0!');
    expect(code('Z9 + 1')).toBe('#REF!');
    expect(code('FOO(1)')).toBe('#NAME?');
    expect(code('LN(0)')).toBe('#NUM!');
    expect(code('SQRT(-4)')).toBe('#NUM!');
    expect(code('"a" + 1')).toBe('#VALUE!');
    expect(code('1 +')).toBe('#SYNTAX!');
    expect(code('(1 + 2')).toBe('#SYNTAX!');
    expect(ERROR_LABELS['#DIV/0!']).toBe('División por cero');
    expect(ERROR_LABELS['#SYNTAX!']).toBe('Fórmula inválida');
  });
});
