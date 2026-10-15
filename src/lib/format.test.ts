import { describe, expect, it } from 'vitest';
import { formatDelta, formatEur, formatNumber } from './format';

describe('format', () => {
  it('formatea euros en español', () => {
    expect(formatEur(1234.5)).toBe('1.234,50 €');
    expect(formatEur(0)).toBe('0,00 €');
  });
  it('formatea números', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(3.14159, 2)).toBe('3,14');
  });
  it('la variación lleva flecha, signo y texto', () => {
    expect(formatDelta(1.25)).toBe('▲ +1,3 %');
    expect(formatDelta(-0.8)).toBe('▼ −0,8 %');
    expect(formatDelta(0)).toBe('0,0 %');
  });
});
