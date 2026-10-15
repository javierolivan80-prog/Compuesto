import { describe, expect, it } from 'vitest';
import { compoundValue } from './interest';

describe('compoundValue', () => {
  it('capitaliza 1000 al 5 % durante 2 años', () => {
    expect(compoundValue(1000, 0.05, 2)).toBeCloseTo(1102.5, 6);
  });
  it('con 0 años devuelve el capital', () => {
    expect(compoundValue(500, 0.1, 0)).toBe(500);
  });
  it('rechaza entradas inválidas', () => {
    expect(() => compoundValue(-1, 0.05, 1)).toThrow(RangeError);
    expect(() => compoundValue(1, 0.05, -1)).toThrow(RangeError);
    expect(() => compoundValue(1, -1, 1)).toThrow(RangeError);
  });
});
