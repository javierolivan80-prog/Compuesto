/* Cálculos financieros puros usados por los explicadores y la corrección. Tipos en % (6 = 6 %). */

export function simpleValue(principal: number, ratePct: number, years: number): number {
  return principal * (1 + (ratePct / 100) * years);
}

export function compoundValueAt(principal: number, ratePct: number, years: number): number {
  return principal * Math.pow(1 + ratePct / 100, years);
}

/** Precio tras `years` años de inflación constante. */
export function inflatedPrice(price: number, inflationPct: number, years: number): number {
  return price * Math.pow(1 + inflationPct / 100, years);
}

/** Lo que valen hoy `amount` euros dentro de `years` años con esa inflación (poder adquisitivo). */
export function purchasingPower(amount: number, inflationPct: number, years: number): number {
  return amount / Math.pow(1 + inflationPct / 100, years);
}

export function doublingYearsRule72(ratePct: number): number {
  if (ratePct <= 0) throw new RangeError('El tipo debe ser positivo');
  return 72 / ratePct;
}

export function doublingYearsExact(ratePct: number): number {
  if (ratePct <= 0) throw new RangeError('El tipo debe ser positivo');
  return Math.log(2) / Math.log(1 + ratePct / 100);
}

/** Rentabilidad real exacta en %: (1 + nominal) / (1 + inflación) − 1. */
export function realReturnPct(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/** Valor actual de una cantidad futura. */
export function presentValue(future: number, ratePct: number, years: number): number {
  return future / Math.pow(1 + ratePct / 100, years);
}
