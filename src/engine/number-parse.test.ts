import { describe, expect, it } from 'vitest';
import { parseNumber } from './number-parse';

describe('parseNumber (es)', () => {
  it.each([
    ['1234', 1234],
    ['1.234', 1234], // en español, punto + 3 dígitos = miles
    ['1.234,56', 1234.56],
    ['1234,5', 1234.5],
    ['12,5', 12.5],
    ['12.5', 12.5], // punto con 1 decimal = decimal (tolerante con quien escribe a la inglesa)
    ['0,001', 0.001],
    ['1.234.567', 1234567],
    ['1 234,5', 1234.5],
    ['1 234,5', 1234.5],
    ['-3,5', -3.5],
    ['−3,5', -3.5], // signo menos tipográfico
    ['+7', 7],
    ['1.001,00 €', 1001],
    ['12,5 %', 12.5],
    ['5€', 5],
    ['1,234', 1.234], // coma = decimal en es
    ['1.102,50', 1102.5],
  ])('%s → %s', (input, expected) => {
    expect(parseNumber(input, 'es')).toBeCloseTo(expected, 10);
  });
  it.each([
    '',
    '  ',
    'abc',
    '1,2,3',
    '1.2.3',
    '12.34.567,8',
    ',5',
    '5,',
    '--3',
    '1e5',
    '1.23,456',
    '€',
  ])('rechaza %j', (input) => {
    expect(parseNumber(input, 'es')).toBeNull();
  });
});

describe('parseNumber (en)', () => {
  it.each([
    ['1,234', 1234],
    ['1,234.56', 1234.56],
    ['1234.5', 1234.5],
    ['3.14', 3.14],
    ['0.001', 0.001],
    ['1,234,567', 1234567],
    ['1,5', 1.5], // una coma con 1 dígito detrás se lee decimal
    ['$1,001.00', 1001],
  ])('%s → %s', (input, expected) => {
    expect(parseNumber(input, 'en')).toBeCloseTo(expected, 10);
  });
});
