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

/** TAE (%) a partir del TIN (%) y del número de liquidaciones al año: (1 + TIN/m)^m − 1. */
export function taeFromTin(tinPct: number, periodsPerYear: number): number {
  if (!Number.isInteger(periodsPerYear) || periodsPerYear < 1)
    throw new RangeError('Las liquidaciones al año deben ser un entero ≥ 1');
  return (Math.pow(1 + tinPct / 100 / periodsPerYear, periodsPerYear) - 1) * 100;
}

/** Cuota mensual constante de un préstamo francés. `ratePct` es el TIN anual (%). */
export function monthlyPayment(principal: number, ratePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (n < 1) throw new RangeError('El plazo debe ser de al menos un mes');
  const r = ratePct / 100 / 12;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
}

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  capital: number;
  balance: number;
}

/** Cuadro de amortización francés completo; la última cuota cierra el saldo en 0. */
export function amortizationSchedule(
  principal: number,
  ratePct: number,
  years: number,
): AmortizationRow[] {
  const n = Math.round(years * 12);
  const payment = monthlyPayment(principal, ratePct, years);
  const r = ratePct / 100 / 12;
  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    const capital = month === n ? balance : payment - interest;
    balance = month === n ? 0 : balance - capital;
    rows.push({ month, payment: interest + capital, interest, capital, balance });
  }
  return rows;
}

/** Intereses totales pagados durante la vida del préstamo. */
export function totalInterest(principal: number, ratePct: number, years: number): number {
  return amortizationSchedule(principal, ratePct, years).reduce((s, r) => s + r.interest, 0);
}
