import { describe, expect, it } from 'vitest';
import { evaluate, evaluateNumber, ExprError, expandRange } from './expr';

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
