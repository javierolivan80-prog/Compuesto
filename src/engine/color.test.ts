import { describe, expect, it } from 'vitest';
import { contrastRatio, oklchToHex, parseOklch } from './color';

describe('color OKLCH', () => {
  it('parsea con y sin alfa', () => {
    expect(parseOklch('oklch(0.16 0.020 255)')).toEqual({ l: 0.16, c: 0.02, h: 255 });
    expect(parseOklch('oklch(0.34 0.020 255 / 0.6)').l).toBe(0.34);
  });
  it('rechaza valores no válidos', () => {
    expect(() => parseOklch('#fff')).toThrow();
  });
  it('blanco sobre negro = 21:1', () => {
    const white = parseOklch('oklch(1 0 0)');
    const black = parseOklch('oklch(0 0 0)');
    expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
  });
  it('contraste simétrico y 1:1 con el mismo color', () => {
    const a = parseOklch('oklch(0.5 0.1 100)');
    const b = parseOklch('oklch(0.9 0.05 200)');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
    expect(contrastRatio(a, a)).toBeCloseTo(1, 10);
  });
  it('convierte a hex', () => {
    expect(oklchToHex(parseOklch('oklch(1 0 0)'))).toBe('#ffffff');
    expect(oklchToHex(parseOklch('oklch(0 0 0)'))).toBe('#000000');
  });
});
