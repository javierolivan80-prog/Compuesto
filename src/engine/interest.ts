/** Valor futuro con interés compuesto anual: capital * (1 + tasa)^años. */
export function compoundValue(principal: number, annualRate: number, years: number): number {
  if (principal < 0) throw new RangeError('principal must be >= 0');
  if (years < 0) throw new RangeError('years must be >= 0');
  if (annualRate <= -1) throw new RangeError('annualRate must be > -1');
  return principal * Math.pow(1 + annualRate, years);
}
