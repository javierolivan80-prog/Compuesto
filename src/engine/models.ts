/*
 * Modelos de referencia (skill `modelo-referencia`): 3 estados, DCF, LBO y merger model.
 * Lógica pura y determinista. Cifras en miles de € salvo los importes por acción (€).
 * Los tipos van en decimal (0,25 = 25 %), a diferencia de finance.ts, porque así se guardan en JSON.
 * Las partidas de los estados se redondean a enteros y los totales se derivan de ellas: las identidades
 * contables cuadran exactamente, igual que en companies.json.
 */
import { mulberry32 } from './prng';

// ───────────────────────── utilidades ─────────────────────────

/** Redondeo a entero simétrico (evita −0). */
export function r0(x: number): number {
  const v = Math.round(x);
  return v === 0 ? 0 : v;
}

/** Redondeo a `d` decimales para guardar resultados con decimales en JSON. */
export function rd(x: number, d = 4): number {
  const f = 10 ** d;
  const v = Math.round(x * f) / f;
  return v === 0 ? 0 : v;
}

/** Elemento i de una serie; falla si no existe (las series de hipótesis deben tener la longitud del modelo). */
export function at<T>(xs: readonly T[], i: number): T {
  const v = xs[i < 0 ? xs.length + i : i];
  if (v === undefined) throw new RangeError(`Falta el elemento ${i} de la serie`);
  return v;
}

/** Saldo de un tramo; falla si el tramo no existe. */
function get(rec: Record<string, number>, k: string): number {
  const v = rec[k];
  if (v === undefined) throw new RangeError(`Tramo desconocido: ${k}`);
  return v;
}

/** VAN de flujos anuales: cf[0] en t=0, cf[i] en t=i. */
export function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
}

/** TIR por bisección entre −99 % y 1.000 %. Exige al menos un cambio de signo. */
export function irr(cashflows: number[]): number {
  let lo = -0.99;
  let hi = 10;
  const fLo = npv(lo, cashflows);
  if (fLo * npv(hi, cashflows) > 0)
    throw new RangeError('Los flujos no tienen una TIR en el rango');
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const f = npv(mid, cashflows);
    if (Math.abs(f) < 1e-9) return mid;
    if (f * fLo > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Percentil con interpolación lineal sobre una muestra ordenada. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) throw new RangeError('Muestra vacía');
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return at(sorted, lo) + (at(sorted, hi) - at(sorted, lo)) * (idx - lo);
}

/** Eje simétrico de 5 puntos alrededor del caso base (centro = base). */
export function axis5(base: number, step: number): number[] {
  return [-2, -1, 0, 1, 2].map((k) => rd(base + k * step, 6));
}

// ───────────────────────── 3 estados ─────────────────────────

export interface Pyg {
  ingresos: number;
  coste_ventas: number;
  gastos_operativos: number;
  amortizacion: number;
  ebit: number;
  gastos_financieros: number;
  bai: number;
  impuestos: number;
  resultado_neto: number;
}

export interface Balance {
  caja: number;
  clientes: number;
  existencias: number;
  inmovilizado: number;
  total_activo: number;
  proveedores: number;
  deuda: number;
  total_pasivo: number;
  capital: number;
  reservas: number;
  total_patrimonio: number;
}

export interface Flujos {
  operativo: number;
  inversion: number;
  financiacion: number;
  variacion_caja: number;
}

/** Mismo esquema que un año de companies.json, para reutilizar checkCompany. */
export interface StatementYear {
  year: number;
  pyg: Pyg;
  balance: Balance;
  flujos: Flujos;
  dividendos: number;
  ampliacion_capital: number;
}

export interface ThreeStatementAssumptions {
  /** Crecimiento de ingresos por año proyectado. */
  revenueGrowth: number[];
  /** Coste de ventas / ingresos, por año. */
  cogsPct: number[];
  /** Gastos operativos (sin amortización) / ingresos, por año. */
  opexPct: number[];
  /** Amortización / inmovilizado inicial del año. */
  daPctOpeningPPE: number;
  /** Inversión (capex) / ingresos. */
  capexPct: number;
  /** Días de cobro sobre ingresos, de existencias y de pago sobre coste de ventas (año de 365 días). */
  dso: number;
  dio: number;
  dpo: number;
  /** Tipo de interés sobre la deuda inicial del año (evita la circularidad). */
  costOfDebt: number;
  taxRate: number;
  /** Dividendos / resultado neto del mismo ejercicio. */
  payout: number;
  /** Amortización contractual de deuda por año (miles de €). */
  debtRepayment: number[];
}

export interface ThreeStatementYear extends StatementYear {
  ebitda: number;
  capex: number;
  variacion_circulante: number;
}

/** Proyecta los 3 estados enlazados a partir del último año real. */
export function projectThreeStatements(
  last: StatementYear,
  a: ThreeStatementAssumptions,
): ThreeStatementYear[] {
  const n = a.revenueGrowth.length;
  for (const arr of [a.cogsPct, a.opexPct, a.debtRepayment])
    if (arr.length !== n) throw new RangeError('Todas las series deben tener la misma longitud');
  const out: ThreeStatementYear[] = [];
  let prev: StatementYear = last;
  for (let i = 0; i < n; i++) {
    const p = prev.balance;
    const ingresos = r0(prev.pyg.ingresos * (1 + at(a.revenueGrowth, i)));
    const coste_ventas = r0(ingresos * at(a.cogsPct, i));
    const gastos_operativos = r0(ingresos * at(a.opexPct, i));
    const amortizacion = r0(p.inmovilizado * a.daPctOpeningPPE);
    const ebit = ingresos - coste_ventas - gastos_operativos - amortizacion;
    const gastos_financieros = r0(p.deuda * a.costOfDebt);
    const bai = ebit - gastos_financieros;
    const impuestos = bai > 0 ? r0(bai * a.taxRate) : 0;
    const resultado_neto = bai - impuestos;

    const capex = r0(ingresos * a.capexPct);
    const inmovilizado = p.inmovilizado + capex - amortizacion;
    const clientes = r0((ingresos * a.dso) / 365);
    const existencias = r0((coste_ventas * a.dio) / 365);
    const proveedores = r0((coste_ventas * a.dpo) / 365);
    const deuda = Math.max(0, p.deuda - at(a.debtRepayment, i));
    const dividendos = Math.max(0, r0(resultado_neto * a.payout));
    const reservas = p.reservas + resultado_neto - dividendos;
    const capital = p.capital;

    const variacion_circulante =
      clientes + existencias - proveedores - (p.clientes + p.existencias - p.proveedores);
    const operativo = resultado_neto + amortizacion - variacion_circulante;
    const inversion = -capex;
    const financiacion = deuda - p.deuda - dividendos;
    const variacion_caja = operativo + inversion + financiacion;
    const caja = p.caja + variacion_caja;

    const total_activo = caja + clientes + existencias + inmovilizado;
    const total_pasivo = proveedores + deuda;
    const total_patrimonio = capital + reservas;

    const y: ThreeStatementYear = {
      year: prev.year + 1,
      pyg: {
        ingresos,
        coste_ventas,
        gastos_operativos,
        amortizacion,
        ebit,
        gastos_financieros,
        bai,
        impuestos,
        resultado_neto,
      },
      balance: {
        caja,
        clientes,
        existencias,
        inmovilizado,
        total_activo,
        proveedores,
        deuda,
        total_pasivo,
        capital,
        reservas,
        total_patrimonio,
      },
      flujos: { operativo, inversion, financiacion, variacion_caja },
      dividendos,
      ampliacion_capital: 0,
      ebitda: ebit + amortizacion,
      capex,
      variacion_circulante,
    };
    out.push(y);
    prev = y;
  }
  return out;
}

// ───────────────────────── DCF ─────────────────────────

export interface WaccInputs {
  riskFree: number;
  equityRiskPremium: number;
  /** Prima por tamaño y liquidez (hipótesis discutible: se enseña como tal). */
  sizePremium: number;
  unleveredBeta: number;
  /** Deuda / (deuda + patrimonio) objetivo, a valor de mercado. */
  targetDebtToCapital: number;
  preTaxCostOfDebt: number;
  taxRate: number;
}

export interface WaccResult {
  debtToEquity: number;
  leveredBeta: number;
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  wacc: number;
}

/** WACC con beta reapalancada por Hamada: βL = βU × (1 + (1 − t) × D/E). */
export function computeWacc(w: WaccInputs): WaccResult {
  const dv = w.targetDebtToCapital;
  const debtToEquity = dv / (1 - dv);
  const leveredBeta = w.unleveredBeta * (1 + (1 - w.taxRate) * debtToEquity);
  const costOfEquity = w.riskFree + leveredBeta * w.equityRiskPremium + w.sizePremium;
  const afterTaxCostOfDebt = w.preTaxCostOfDebt * (1 - w.taxRate);
  const wacc = (1 - dv) * costOfEquity + dv * afterTaxCostOfDebt;
  return { debtToEquity, leveredBeta, costOfEquity, afterTaxCostOfDebt, wacc };
}

export interface FcffYear {
  year: number;
  ebit: number;
  impuestos_operativos: number;
  nopat: number;
  amortizacion: number;
  capex: number;
  variacion_circulante: number;
  fcff: number;
}

/** Flujo de caja libre para la empresa (FCFF) de cada año proyectado. */
export function fcffFromProjection(years: ThreeStatementYear[], taxRate: number): FcffYear[] {
  return years.map((y) => {
    const impuestos_operativos = y.pyg.ebit * taxRate;
    const nopat = y.pyg.ebit - impuestos_operativos;
    const fcff = nopat + y.pyg.amortizacion - y.capex - y.variacion_circulante;
    return {
      year: y.year,
      ebit: y.pyg.ebit,
      impuestos_operativos,
      nopat,
      amortizacion: y.pyg.amortizacion,
      capex: y.capex,
      variacion_circulante: y.variacion_circulante,
      fcff,
    };
  });
}

export interface DcfValuation {
  wacc: number;
  terminalGrowth: number;
  discountPeriods: number[];
  discountFactors: number[];
  pvFcff: number[];
  sumPvFcff: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  pricePerShare: number;
  terminalValueShareOfEv: number;
}

/**
 * DCF con convención de mitad de año. Valor terminal por Gordon descontado también a mitad de año
 * (N − 0,5), y por múltiplo a final de año (N), como en Rosenbaum y Pearl, cap. 3.
 */
export function dcfGordon(
  fcff: number[],
  wacc: number,
  g: number,
  netDebt: number,
  shares: number,
  midYear = true,
): DcfValuation {
  if (g >= wacc) throw new RangeError('El crecimiento terminal debe ser menor que el WACC');
  const n = fcff.length;
  const discountPeriods = fcff.map((_, i) => (midYear ? i + 0.5 : i + 1));
  const discountFactors = discountPeriods.map((t) => 1 / Math.pow(1 + wacc, t));
  const pvFcff = fcff.map((f, i) => f * at(discountFactors, i));
  const sumPvFcff = pvFcff.reduce((s, x) => s + x, 0);
  const terminalValue = (at(fcff, n - 1) * (1 + g)) / (wacc - g);
  const pvTerminalValue = terminalValue * at(discountFactors, n - 1);
  const enterpriseValue = sumPvFcff + pvTerminalValue;
  const equityValue = enterpriseValue - netDebt;
  return {
    wacc,
    terminalGrowth: g,
    discountPeriods,
    discountFactors,
    pvFcff,
    sumPvFcff,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    equityValue,
    pricePerShare: (equityValue * 1000) / shares,
    terminalValueShareOfEv: pvTerminalValue / enterpriseValue,
  };
}

export interface DcfExitMultiple {
  exitMultiple: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  pricePerShare: number;
  /** Crecimiento perpetuo que implica el múltiplo de salida: g = (TV × WACC − FCF) / (TV + FCF). */
  impliedGrowth: number;
}

export function dcfExitMultiple(
  fcff: number[],
  lastEbitda: number,
  wacc: number,
  exitMultiple: number,
  netDebt: number,
  shares: number,
): DcfExitMultiple {
  const n = fcff.length;
  const sumPv = fcff.reduce((s, f, i) => s + f / Math.pow(1 + wacc, i + 0.5), 0);
  const terminalValue = lastEbitda * exitMultiple;
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, n);
  const enterpriseValue = sumPv + pvTerminalValue;
  const equityValue = enterpriseValue - netDebt;
  const last = at(fcff, n - 1);
  return {
    exitMultiple,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    equityValue,
    pricePerShare: (equityValue * 1000) / shares,
    impliedGrowth: (terminalValue * wacc - last) / (terminalValue + last),
  };
}

/** Múltiplo EV/EBITDA que implica el valor terminal de Gordon. */
export function impliedExitMultiple(terminalValue: number, lastEbitda: number): number {
  return terminalValue / lastEbitda;
}

// ───────────────────────── Monte Carlo ─────────────────────────

/** Normal estándar por Box-Muller a partir de un PRNG uniforme. */
export function normalSampler(rand: () => number): () => number {
  return () => {
    let u = 0;
    while (u === 0) u = rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export interface MonteCarloSpec {
  seed: number;
  iterations: number;
  /** Desviación típica del desplazamiento de crecimiento aplicado a todos los años. */
  growthShiftSd: number;
  /** Desviación típica del desplazamiento del margen EBITDA (vía gastos operativos). */
  marginShiftSd: number;
  waccSd: number;
  terminalGrowthMin: number;
  terminalGrowthMode: number;
  terminalGrowthMax: number;
  /** Diferencial mínimo entre WACC y g para que Gordon tenga sentido. */
  minSpread: number;
  /** Precio de referencia para la probabilidad de que el valor supere al mercado. */
  referencePrice: number;
}

export interface MonteCarloResult {
  iterations: number;
  mean: number;
  sd: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  probAboveReference: number;
}

/** Triangular por inversión de la función de distribución. */
function triangular(u: number, a: number, c: number, b: number): number {
  const fc = (c - a) / (b - a);
  return u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

export function monteCarloDcf(
  last: StatementYear,
  base: ThreeStatementAssumptions,
  baseWacc: number,
  netDebt: number,
  shares: number,
  spec: MonteCarloSpec,
): MonteCarloResult {
  const rand = mulberry32(spec.seed);
  const normal = normalSampler(rand);
  const prices: number[] = [];
  for (let i = 0; i < spec.iterations; i++) {
    const dg = normal() * spec.growthShiftSd;
    const dm = normal() * spec.marginShiftSd;
    const wacc = baseWacc + normal() * spec.waccSd;
    const g = Math.min(
      triangular(rand(), spec.terminalGrowthMin, spec.terminalGrowthMode, spec.terminalGrowthMax),
      wacc - spec.minSpread,
    );
    const a: ThreeStatementAssumptions = {
      ...base,
      revenueGrowth: base.revenueGrowth.map((x) => x + dg),
      opexPct: base.opexPct.map((x) => x - dm),
    };
    const proj = projectThreeStatements(last, a);
    const f = fcffFromProjection(proj, base.taxRate).map((y) => y.fcff);
    prices.push(dcfGordon(f, wacc, g, netDebt, shares).pricePerShare);
  }
  const sorted = [...prices].sort((x, y) => x - y);
  const mean = prices.reduce((s, x) => s + x, 0) / prices.length;
  const sd = Math.sqrt(prices.reduce((s, x) => s + (x - mean) ** 2, 0) / (prices.length - 1));
  return {
    iterations: spec.iterations,
    mean,
    sd,
    p5: percentile(sorted, 0.05),
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p95: percentile(sorted, 0.95),
    probAboveReference: prices.filter((p) => p > spec.referencePrice).length / prices.length,
  };
}

// ───────────────────────── LBO ─────────────────────────

export interface Tranche {
  id: string;
  name: string;
  /** Múltiplo de EBITDA de entrada. */
  multiple: number;
  /** Interés en efectivo sobre el saldo inicial del año. */
  cashRate: number;
  /** Interés capitalizado (PIK) sobre el saldo inicial del año. */
  pikRate: number;
  /** Amortización obligatoria anual, en % del principal original. */
  mandatoryAmortPct: number;
  /** Orden en el barrido de caja (1 = primero); null si no se barre. */
  sweepPriority: number | null;
}

export interface LboAssumptions {
  offerPricePerShare: number;
  unaffectedPricePerShare: number;
  shares: number;
  exitMultiple: number;
  /** Comisiones de la operación (asesores, legal) en % del EV de entrada; se pagan al cierre. */
  transactionFeePct: number;
  /** Comisiones de financiación en % de la deuda nueva; se amortizan linealmente en `years`. */
  financingFeePct: number;
  minCash: number;
  tranches: Tranche[];
  /** Porcentaje de la caja excedente que se dedica al barrido. */
  sweepPct: number;
  /** Límite de deducibilidad de gastos financieros netos (art. 16 LIS): % del beneficio operativo. */
  interestCapPct: number;
  /** Importe deducible en todo caso (art. 16 LIS: 1 millón de €). */
  interestCapFloor: number;
  /** Supuestos operativos del plan del fondo (pueden diferir del caso base de la empresa). */
  operating: ThreeStatementAssumptions;
}

export interface LboYear {
  year: number;
  ingresos: number;
  ebitda: number;
  amortizacion: number;
  ebit: number;
  interes_efectivo: number;
  interes_pik: number;
  amortizacion_comisiones: number;
  gastos_financieros_netos: number;
  gasto_financiero_deducible: number;
  exceso_no_deducido_pendiente: number;
  base_imponible: number;
  impuestos: number;
  resultado_neto: number;
  capex: number;
  variacion_circulante: number;
  flujo_caja_libre: number;
  amortizacion_obligatoria: number;
  barrido: number;
  caja_inicial: number;
  caja_final: number;
  deuda_inicial: Record<string, number>;
  deuda_final: Record<string, number>;
  deuda_total_final: number;
  deuda_neta_final: number;
  deuda_neta_ebitda: number;
  cobertura_intereses: number;
}

export interface LboResult {
  entry: {
    ltmEbitda: number;
    equityPurchasePrice: number;
    premium: number;
    enterpriseValue: number;
    entryMultiple: number;
    netDebtTarget: number;
  };
  sources: { id: string; name: string; amount: number }[];
  uses: { id: string; name: string; amount: number }[];
  totalSources: number;
  totalUses: number;
  sponsorEquity: number;
  years: LboYear[];
  exit: {
    year: number;
    ebitda: number;
    enterpriseValue: number;
    netDebt: number;
    equityValue: number;
  };
  cashflows: number[];
  irr: number;
  moic: number;
  bridge: {
    ebitdaGrowth: number;
    multipleChange: number;
    deleveraging: number;
    fees: number;
    total: number;
  };
}

export function buildLbo(last: StatementYear, a: LboAssumptions): LboResult {
  const o = a.operating;
  const n = o.revenueGrowth.length;
  const lb = last.balance;
  const ltmEbitda = last.pyg.ebit + last.pyg.amortizacion;
  const equityPurchasePrice = r0((a.offerPricePerShare * a.shares) / 1000);
  const netDebtTarget = lb.deuda - lb.caja;
  const enterpriseValue = equityPurchasePrice + netDebtTarget;
  const transactionFees = r0(enterpriseValue * a.transactionFeePct);

  const principal: Record<string, number> = {};
  for (const t of a.tranches) principal[t.id] = r0(ltmEbitda * t.multiple);
  const newDebt = Object.values(principal).reduce((s, x) => s + x, 0);
  const financingFees = r0(newDebt * a.financingFeePct);
  const targetCashUsed = lb.caja - a.minCash;

  const uses = [
    { id: 'compra_acciones', name: 'Compra de las acciones', amount: equityPurchasePrice },
    { id: 'refinanciacion', name: 'Refinanciación de la deuda existente', amount: lb.deuda },
    { id: 'comisiones_operacion', name: 'Comisiones de la operación', amount: transactionFees },
    { id: 'comisiones_financiacion', name: 'Comisiones de financiación', amount: financingFees },
  ];
  const totalUses = uses.reduce((s, u) => s + u.amount, 0);
  const sponsorEquity = totalUses - newDebt - targetCashUsed;
  const sources = [
    ...a.tranches.map((t) => ({ id: t.id, name: t.name, amount: get(principal, t.id) })),
    { id: 'caja_sociedad', name: 'Caja de la sociedad (sobre el mínimo)', amount: targetCashUsed },
    { id: 'capital_fondo', name: 'Capital del fondo (sponsor equity)', amount: sponsorEquity },
  ];
  const totalSources = sources.reduce((s, x) => s + x.amount, 0);

  // Operativa: los mismos 3 estados sin la financiación, para ingresos, márgenes, capex y circulante.
  const ops = projectThreeStatements(last, { ...o, debtRepayment: o.revenueGrowth.map(() => 0) });

  const bal: Record<string, number> = { ...principal };
  let cash = a.minCash;
  let carry = 0;
  const feeAmort = r0(financingFees / n);
  const years: LboYear[] = [];
  ops.forEach((y, i) => {
    const deuda_inicial = { ...bal };
    const caja_inicial = cash;
    let interes_efectivo = 0;
    let interes_pik = 0;
    for (const t of a.tranches) {
      interes_efectivo += r0(get(bal, t.id) * t.cashRate);
      interes_pik += r0(get(bal, t.id) * t.pikRate);
    }
    const amortizacion_comisiones = i === n - 1 ? financingFees - feeAmort * (n - 1) : feeAmort;
    const gastos_financieros_netos = interes_efectivo + interes_pik + amortizacion_comisiones;
    const ebitda = y.ebitda;
    const cap = Math.max(a.interestCapFloor, r0(ebitda * a.interestCapPct));
    const pending = gastos_financieros_netos + carry;
    const gasto_financiero_deducible = Math.min(pending, cap);
    carry = pending - gasto_financiero_deducible;
    const base_imponible = y.pyg.ebit - gasto_financiero_deducible;
    const impuestos = base_imponible > 0 ? r0(base_imponible * o.taxRate) : 0;
    const resultado_neto = y.pyg.ebit - gastos_financieros_netos - impuestos;
    const flujo_caja_libre =
      resultado_neto +
      y.pyg.amortizacion +
      interes_pik +
      amortizacion_comisiones -
      y.capex -
      y.variacion_circulante;

    // PIK: se capitaliza antes de amortizar.
    for (const t of a.tranches)
      bal[t.id] = get(bal, t.id) + r0(get(deuda_inicial, t.id) * t.pikRate);
    let amortizacion_obligatoria = 0;
    for (const t of a.tranches) {
      const m = Math.min(get(bal, t.id), r0(get(principal, t.id) * t.mandatoryAmortPct));
      bal[t.id] = get(bal, t.id) - m;
      amortizacion_obligatoria += m;
    }
    let available = caja_inicial + flujo_caja_libre - amortizacion_obligatoria - a.minCash;
    if (available < 0)
      throw new RangeError(`Año ${y.year}: la caja no cubre la amortización obligatoria`);
    let sweepBudget = r0(available * a.sweepPct);
    let barrido = 0;
    for (const t of [...a.tranches]
      .filter((t) => t.sweepPriority !== null)
      .sort((x, z) => (x.sweepPriority ?? 0) - (z.sweepPriority ?? 0))) {
      const pay = Math.min(get(bal, t.id), sweepBudget);
      bal[t.id] = get(bal, t.id) - pay;
      sweepBudget -= pay;
      barrido += pay;
    }
    available -= barrido;
    cash = a.minCash + available;

    const deuda_total_final = Object.values(bal).reduce((s, x) => s + x, 0);
    years.push({
      year: y.year,
      ingresos: y.pyg.ingresos,
      ebitda,
      amortizacion: y.pyg.amortizacion,
      ebit: y.pyg.ebit,
      interes_efectivo,
      interes_pik,
      amortizacion_comisiones,
      gastos_financieros_netos,
      gasto_financiero_deducible,
      exceso_no_deducido_pendiente: carry,
      base_imponible,
      impuestos,
      resultado_neto,
      capex: y.capex,
      variacion_circulante: y.variacion_circulante,
      flujo_caja_libre,
      amortizacion_obligatoria,
      barrido,
      caja_inicial,
      caja_final: cash,
      deuda_inicial,
      deuda_final: { ...bal },
      deuda_total_final,
      deuda_neta_final: deuda_total_final - cash,
      deuda_neta_ebitda: rd((deuda_total_final - cash) / ebitda, 4),
      cobertura_intereses: rd(ebitda / interes_efectivo, 4),
    });
  });

  const lastY = at(years, n - 1);
  const exitEv = r0(lastY.ebitda * a.exitMultiple);
  const exitEquity = exitEv - lastY.deuda_neta_final;
  const cashflows = [-sponsorEquity, ...years.map((_, i) => (i === n - 1 ? exitEquity : 0))];
  const entryNetDebt = newDebt - a.minCash;
  const entryMultiple = enterpriseValue / ltmEbitda;
  const bridge = {
    ebitdaGrowth: (lastY.ebitda - ltmEbitda) * entryMultiple,
    multipleChange: (a.exitMultiple - entryMultiple) * lastY.ebitda,
    deleveraging: entryNetDebt - lastY.deuda_neta_final,
    fees: -(transactionFees + financingFees),
    total: 0,
  };
  // El redondeo del EV de salida se asigna al cambio de múltiplo para que el puente cuadre al céntimo.
  bridge.multipleChange += exitEv - lastY.ebitda * a.exitMultiple;
  bridge.total = bridge.ebitdaGrowth + bridge.multipleChange + bridge.deleveraging + bridge.fees;

  return {
    entry: {
      ltmEbitda,
      equityPurchasePrice,
      premium: a.offerPricePerShare / a.unaffectedPricePerShare - 1,
      enterpriseValue,
      entryMultiple,
      netDebtTarget,
    },
    sources,
    uses,
    totalSources,
    totalUses,
    sponsorEquity,
    years,
    exit: {
      year: lastY.year,
      ebitda: lastY.ebitda,
      enterpriseValue: exitEv,
      netDebt: lastY.deuda_neta_final,
      equityValue: exitEquity,
    },
    cashflows,
    irr: irr(cashflows),
    moic: exitEquity / sponsorEquity,
    bridge,
  };
}

// ───────────────────────── Merger model ─────────────────────────

export interface AcquirerInputs {
  name: string;
  sharePrice: number;
  /** Acciones en miles. */
  sharesThousands: number;
  /** Beneficio neto standalone previsto (miles de €) para los años del análisis. */
  netIncome: number[];
  cash: number;
  debt: number;
  taxRate: number;
  /** Rentabilidad antes de impuestos de la caja que se deja de cobrar. */
  interestOnCash: number;
  /** Coste antes de impuestos de la deuda nueva. */
  costOfNewDebt: number;
}

export interface MergerDeal {
  offerPricePerShare: number;
  unaffectedPricePerShare: number;
  targetShares: number;
  /** Parte pagada en efectivo (0–1); el resto, en acciones nuevas de la compradora. */
  cashPct: number;
  /** Parte del efectivo que sale de la caja de la compradora (el resto, deuda nueva). */
  cashFromBalancePct: number;
  /** Sinergias de costes recurrentes a pleno rendimiento (antes de impuestos). */
  runRateSynergies: number;
  synergyPhaseIn: number[];
  /** Intangibles identificados en la asignación del precio (PPA) y su vida útil. */
  identifiedIntangibles: number;
  intangibleLifeYears: number;
  advisoryFeePct: number;
  financingFeePct: number;
  financingFeeAmortYears: number;
}

export interface MergerYear {
  year: number;
  acquirerNetIncome: number;
  targetNetIncome: number;
  synergiesAfterTax: number;
  foregoneInterestAfterTax: number;
  newDebtInterestAfterTax: number;
  intangibleAmortAfterTax: number;
  financingFeeAmortAfterTax: number;
  proFormaNetIncome: number;
  standaloneShares: number;
  proFormaShares: number;
  standaloneEps: number;
  proFormaEps: number;
  accretionDilution: number;
  /** Sinergias antes de impuestos necesarias ese año para que la operación sea neutra en BPA. */
  breakevenSynergies: number;
}

export interface MergerResult {
  purchase: {
    equityValue: number;
    premium: number;
    targetNetDebt: number;
    enterpriseValue: number;
    evToLtmEbitda: number;
    peNextYear: number;
  };
  consideration: {
    cash: number;
    stock: number;
    newShares: number;
    exchangeRatio: number;
  };
  sources: { id: string; name: string; amount: number }[];
  uses: { id: string; name: string; amount: number }[];
  totalSources: number;
  totalUses: number;
  ppa: {
    equityPurchasePrice: number;
    targetBookEquity: number;
    excessPurchasePrice: number;
    identifiedIntangibles: number;
    deferredTaxLiability: number;
    goodwill: number;
  };
  years: MergerYear[];
}

export function buildMerger(
  acq: AcquirerInputs,
  target: { lastYear: StatementYear; netIncome: number[]; years: number[] },
  d: MergerDeal,
): MergerResult {
  const t = acq.taxRate;
  const lb = target.lastYear.balance;
  const equityValue = (d.offerPricePerShare * d.targetShares) / 1000;
  const targetNetDebt = lb.deuda - lb.caja;
  const enterpriseValue = equityValue + targetNetDebt;
  const ltmEbitda = target.lastYear.pyg.ebit + target.lastYear.pyg.amortizacion;

  const cash = equityValue * d.cashPct;
  const stock = equityValue - cash;
  const newShares = stock / acq.sharePrice;
  const exchangeRatio = (d.offerPricePerShare * (1 - d.cashPct)) / acq.sharePrice;

  const advisoryFees = equityValue * d.advisoryFeePct;
  const cashFromBalance = (cash + advisoryFees) * d.cashFromBalancePct;
  const newDebtNet = cash + advisoryFees - cashFromBalance;
  // La comisión de financiación se financia con la propia deuda: D = neto / (1 − f).
  const newDebt = newDebtNet / (1 - d.financingFeePct);
  const financingFees = newDebt - newDebtNet;

  const uses = [
    { id: 'efectivo_accionistas', name: 'Pago en efectivo a los accionistas', amount: cash },
    { id: 'acciones_entregadas', name: 'Acciones nuevas entregadas', amount: stock },
    { id: 'comisiones_asesoramiento', name: 'Comisiones de asesoramiento', amount: advisoryFees },
    { id: 'comisiones_financiacion', name: 'Comisiones de financiación', amount: financingFees },
  ];
  const sources = [
    { id: 'caja_compradora', name: 'Caja de la compradora', amount: cashFromBalance },
    { id: 'deuda_nueva', name: 'Deuda nueva', amount: newDebt },
    { id: 'acciones_nuevas', name: 'Emisión de acciones nuevas', amount: stock },
  ];
  const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);

  const targetBookEquity = lb.total_patrimonio;
  const excessPurchasePrice = equityValue - targetBookEquity;
  const deferredTaxLiability = d.identifiedIntangibles * t;
  const goodwill = excessPurchasePrice - d.identifiedIntangibles + deferredTaxLiability;

  const standaloneShares = acq.sharesThousands;
  const proFormaShares = standaloneShares + newShares;
  const years: MergerYear[] = target.years.map((year, i) => {
    const acquirerNetIncome = at(acq.netIncome, i);
    const targetNetIncome = at(target.netIncome, i);
    const synergiesAfterTax = d.runRateSynergies * at(d.synergyPhaseIn, i) * (1 - t);
    const foregoneInterestAfterTax = cashFromBalance * acq.interestOnCash * (1 - t);
    const newDebtInterestAfterTax = newDebt * acq.costOfNewDebt * (1 - t);
    const intangibleAmortAfterTax = (d.identifiedIntangibles / d.intangibleLifeYears) * (1 - t);
    const financingFeeAmortAfterTax =
      i < d.financingFeeAmortYears ? (financingFees / d.financingFeeAmortYears) * (1 - t) : 0;
    const exSynergies =
      acquirerNetIncome +
      targetNetIncome -
      foregoneInterestAfterTax -
      newDebtInterestAfterTax -
      intangibleAmortAfterTax -
      financingFeeAmortAfterTax;
    const proFormaNetIncome = exSynergies + synergiesAfterTax;
    const standaloneEps = acquirerNetIncome / standaloneShares;
    const proFormaEps = proFormaNetIncome / proFormaShares;
    return {
      year,
      acquirerNetIncome,
      targetNetIncome,
      synergiesAfterTax,
      foregoneInterestAfterTax,
      newDebtInterestAfterTax,
      intangibleAmortAfterTax,
      financingFeeAmortAfterTax,
      proFormaNetIncome,
      standaloneShares,
      proFormaShares,
      standaloneEps,
      proFormaEps,
      accretionDilution: proFormaEps / standaloneEps - 1,
      breakevenSynergies: Math.max(0, (standaloneEps * proFormaShares - exSynergies) / (1 - t)),
    };
  });

  return {
    purchase: {
      equityValue,
      premium: d.offerPricePerShare / d.unaffectedPricePerShare - 1,
      targetNetDebt,
      enterpriseValue,
      evToLtmEbitda: enterpriseValue / ltmEbitda,
      peNextYear: equityValue / at(target.netIncome, 0),
    },
    consideration: { cash, stock, newShares, exchangeRatio },
    sources,
    uses,
    totalSources: sum(sources),
    totalUses: sum(uses),
    ppa: {
      equityPurchasePrice: equityValue,
      targetBookEquity,
      excessPurchasePrice,
      identifiedIntangibles: d.identifiedIntangibles,
      deferredTaxLiability,
      goodwill,
    },
    years,
  };
}
