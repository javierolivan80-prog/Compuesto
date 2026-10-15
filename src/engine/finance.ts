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

export interface DepositRound {
  round: number;
  deposit: number;
  reserve: number;
  loan: number;
  /** Depósitos acumulados hasta esta ronda (inclusive). */
  cumulative: number;
}

/**
 * Modelo escolar del multiplicador del dinero: cada depósito se queda en reserva en `ratioPct` % y el resto
 * se presta; ese préstamo vuelve al sistema como nuevo depósito.
 */
export function depositChain(deposit: number, ratioPct: number, rounds: number): DepositRound[] {
  if (ratioPct <= 0 || ratioPct > 100)
    throw new RangeError('El coeficiente debe estar entre 0 y 100');
  const r = ratioPct / 100;
  const out: DepositRound[] = [];
  let d = deposit;
  let cumulative = 0;
  for (let round = 1; round <= rounds; round++) {
    cumulative += d;
    out.push({ round, deposit: d, reserve: d * r, loan: d * (1 - r), cumulative });
    d = d * (1 - r);
  }
  return out;
}

/** Límite del modelo: depósito inicial / coeficiente de reservas. */
export function maxDeposits(deposit: number, ratioPct: number): number {
  if (ratioPct <= 0 || ratioPct > 100)
    throw new RangeError('El coeficiente debe estar entre 0 y 100');
  return deposit / (ratioPct / 100);
}

/** Capitalización bursátil: precio por acción × acciones en circulación. */
export function marketCap(price: number, shares: number): number {
  if (price < 0 || shares < 0) throw new RangeError('Precio y acciones no pueden ser negativos');
  return price * shares;
}

/** Acciones del free float dado el porcentaje (0–100) que cotiza libremente. */
export function freeFloatShares(shares: number, freeFloatPct: number): number {
  if (freeFloatPct < 0 || freeFloatPct > 100)
    throw new RangeError('El free float debe estar entre 0 y 100');
  return (shares * freeFloatPct) / 100;
}

export interface IndexConstituent {
  name: string;
  /** Capitalización (o capitalización ajustada por free float) */
  cap: number;
  /** Rentabilidad del valor en % */
  returnPct: number;
}

export interface IndexContribution extends IndexConstituent {
  /** Peso en el índice, en % */
  weightPct: number;
  /** Aportación a la rentabilidad del índice, en puntos porcentuales */
  contributionPp: number;
}

/** Índice ponderado por capitalización: peso = cap / suma de caps; rentabilidad = Σ peso × rentabilidad. */
export function capWeightedIndex(items: readonly IndexConstituent[]): {
  rows: IndexContribution[];
  returnPct: number;
} {
  const total = items.reduce((s, i) => s + i.cap, 0);
  if (items.length === 0 || total <= 0)
    throw new RangeError('El índice necesita valores con capitalización positiva');
  const rows = items.map((i) => {
    const weightPct = (i.cap / total) * 100;
    return { ...i, weightPct, contributionPp: (weightPct * i.returnPct) / 100 };
  });
  return { rows, returnPct: rows.reduce((s, r) => s + r.contributionPp, 0) };
}

/** Precio teórico tras una ampliación (TERP): media ponderada del precio actual y del precio de emisión. */
export function theoreticalExRightsPrice(
  price: number,
  shares: number,
  issuePrice: number,
  newShares: number,
): number {
  if (shares <= 0 || newShares < 0) throw new RangeError('Número de acciones no válido');
  return (price * shares + issuePrice * newShares) / (shares + newShares);
}

/** Valor teórico de un derecho de suscripción: precio actual − precio teórico tras la ampliación. */
export function rightValue(
  price: number,
  shares: number,
  issuePrice: number,
  newShares: number,
): number {
  return price - theoreticalExRightsPrice(price, shares, issuePrice, newShares);
}

/** Split N×1: las acciones se multiplican por `ratio` y el precio se divide; la capitalización no cambia. */
export function stockSplit(
  price: number,
  shares: number,
  ratio: number,
): { price: number; shares: number } {
  if (!Number.isInteger(ratio) || ratio < 2)
    throw new RangeError('El ratio debe ser un entero ≥ 2');
  return { price: price / ratio, shares: shares * ratio };
}
