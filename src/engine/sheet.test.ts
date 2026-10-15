import { describe, expect, it } from 'vitest';
import { evaluateSheet, numericValue, precedents } from './sheet';

describe('hoja de cálculo', () => {
  it('evalúa valores, fórmulas y dependencias encadenadas', () => {
    const r = evaluateSheet({
      A1: 1000,
      A2: 5,
      B1: '=A1*A2/100',
      B2: '=A1+B1',
      B3: '=SUMA(A1:B2)',
    });
    expect(r.B1!.value).toBe(50);
    expect(r.B2!.value).toBe(1050);
    expect(r.B3!.value).toBe(1000 + 5 + 50 + 1050);
  });
  it('lee números con coma decimal y deja el texto como texto', () => {
    const r = evaluateSheet({ A1: '1.234,5', A2: 'hola', A3: '=A1*2' });
    expect(r.A1!.value).toBe(1234.5);
    expect(r.A2!.value).toBe('hola');
    expect(r.A3!.value).toBe(2469);
  });
  it('las celdas vacías valen 0 en las operaciones y se ignoran en los rangos', () => {
    const r = evaluateSheet({ A1: 10, A2: '', B1: '=A1+Z9', B2: '=PROMEDIO(A1:A3)' });
    expect(r.B1!.value).toBe(10);
    expect(r.B2!.value).toBe(10);
  });
  it('los errores llevan código y mensaje y se propagan a las celdas dependientes', () => {
    const r = evaluateSheet({
      A1: 0,
      B1: '=1/A1',
      B2: '=B1+1',
      B3: '=FOO(1)',
      B4: '=LN(0)',
      B5: '=1 +',
    });
    expect(r.B1).toMatchObject({ error: '#DIV/0!', message: 'División por cero' });
    expect(r.B2).toMatchObject({ error: '#DIV/0!' });
    expect(r.B2!.message).toContain('B1');
    expect(r.B3!.error).toBe('#NAME?');
    expect(r.B4!.error).toBe('#NUM!');
    expect(r.B5!.error).toBe('#SYNTAX!');
    expect(numericValue(r.B1)).toBeNull();
  });
  it('detecta referencias circulares', () => {
    const r = evaluateSheet({ A1: '=B1', B1: '=A1+1', C1: '=C1' });
    expect(r.A1!.error).toBe('#CIRC!');
    expect(r.C1!.error).toBe('#CIRC!');
  });
  it('referencia a una celda inexistente fuera de rangos: se trata como vacía (0)', () => {
    expect(evaluateSheet({ A1: '=B7*2' }).A1!.value).toBe(0);
  });
  it('lista los precedentes de una fórmula (con rangos, ignorando texto entre comillas)', () => {
    expect(precedents('=SUMA(A1:A3)+b2*C10')).toEqual(['A1', 'A2', 'A3', 'B2', 'C10']);
    expect(precedents('="A1"&B1')).toEqual(['B1']);
  });
  it('VNA y TIR sobre rangos de la hoja', () => {
    const r = evaluateSheet({
      A1: -1000,
      A2: 400,
      A3: 400,
      A4: 400,
      B1: '=TIR(A1:A4)',
      B2: '=A1+VNA(0,1;A2:A4)',
    });
    expect(r.B1!.value as number).toBeCloseTo(0.097010257403, 9);
    expect(r.B2!.value as number).toBeCloseTo(-1000 + 400 / 1.1 + 400 / 1.21 + 400 / 1.331, 6);
  });
});
