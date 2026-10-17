import { describe, expect, it } from 'vitest';
import {
  at,
  axis5,
  buildLbo,
  buildMerger,
  computeWacc,
  dcfExitMultiple,
  dcfGordon,
  impliedExitMultiple,
  irr,
  monteCarloDcf,
  npv,
  percentile,
  projectThreeStatements,
  r0,
  rd,
  type LboAssumptions,
  type StatementYear,
  type ThreeStatementAssumptions,
} from './models';

const last: StatementYear = {
  year: 2025,
  pyg: {
    ingresos: 10000,
    coste_ventas: 6000,
    gastos_operativos: 2000,
    amortizacion: 400,
    ebit: 1600,
    gastos_financieros: 100,
    bai: 1500,
    impuestos: 375,
    resultado_neto: 1125,
  },
  balance: {
    caja: 2000,
    clientes: 1644,
    existencias: 1151,
    inmovilizado: 5000,
    total_activo: 9795,
    proveedores: 822,
    deuda: 2000,
    total_pasivo: 2822,
    capital: 1000,
    reservas: 5973,
    total_patrimonio: 6973,
  },
  flujos: { operativo: 0, inversion: 0, financiacion: 0, variacion_caja: 0 },
  dividendos: 0,
  ampliacion_capital: 0,
};
const ops: ThreeStatementAssumptions = {
  revenueGrowth: [0.05, 0.05, 0.05],
  cogsPct: [0.6, 0.6, 0.6],
  opexPct: [0.2, 0.2, 0.2],
  daPctOpeningPPE: 0.08,
  capexPct: 0.05,
  dso: 60,
  dio: 70,
  dpo: 50,
  costOfDebt: 0.05,
  taxRate: 0.25,
  payout: 0.5,
  debtRepayment: [500, 500, 5000],
};

describe('utilidades', () => {
  it('redondeos sin −0', () => {
    expect(Object.is(r0(-0.2), 0)).toBe(true);
    expect(Object.is(rd(-0.00001, 2), 0)).toBe(true);
    expect(rd(1.23456, 2)).toBe(1.23);
  });
  it('TIR y VAN', () => {
    const cfs = [-100, 0, 121];
    expect(irr(cfs)).toBeCloseTo(0.1, 9);
    expect(npv(0.1, cfs)).toBeCloseTo(0, 9);
    expect(() => irr([100, 10])).toThrow(RangeError);
  });
  it('at: índices negativos y error si falta el elemento', () => {
    expect(at([1, 2, 3], -1)).toBe(3);
    expect(() => at([1], 3)).toThrow(RangeError);
  });
  it('percentil y ejes', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(() => percentile([], 0.5)).toThrow(RangeError);
    expect(axis5(0.08, 0.005)).toEqual([0.07, 0.075, 0.08, 0.085, 0.09]);
  });
});

describe('3 estados', () => {
  it('cuadra, deja la deuda en 0 como mínimo y no paga impuestos con pérdidas', () => {
    const p = projectThreeStatements(last, ops);
    for (const y of p)
      expect(y.balance.total_activo).toBe(y.balance.total_pasivo + y.balance.total_patrimonio);
    expect(at(p, 2).balance.deuda).toBe(0);
    const loss = projectThreeStatements(last, { ...ops, opexPct: [0.5, 0.5, 0.5] });
    expect(at(loss, 0).pyg.impuestos).toBe(0);
    expect(at(loss, 0).dividendos).toBe(0);
  });
  it('rechaza series de distinta longitud', () => {
    expect(() => projectThreeStatements(last, { ...ops, cogsPct: [0.6] })).toThrow(RangeError);
  });
});

describe('DCF', () => {
  it('WACC con Hamada y Gordon con y sin mitad de año', () => {
    const w = computeWacc({
      riskFree: 0.03,
      equityRiskPremium: 0.05,
      sizePremium: 0,
      unleveredBeta: 1,
      targetDebtToCapital: 0.5,
      preTaxCostOfDebt: 0.04,
      taxRate: 0.25,
    });
    expect(w.leveredBeta).toBeCloseTo(1.75, 12);
    expect(w.wacc).toBeCloseTo(0.5 * (0.03 + 1.75 * 0.05) + 0.5 * 0.03, 12);
    const mid = dcfGordon([100, 100], 0.1, 0.02, 0, 1000);
    const end = dcfGordon([100, 100], 0.1, 0.02, 0, 1000, false);
    expect(mid.enterpriseValue).toBeGreaterThan(end.enterpriseValue);
    expect(end.enterpriseValue).toBeCloseTo(100 / 1.1 + 100 / 1.21 + 1275 / 1.21, 9);
    expect(() => dcfGordon([100], 0.05, 0.05, 0, 1)).toThrow(RangeError);
  });
  it('el crecimiento implícito en un múltiplo devuelve el mismo valor terminal por Gordon', () => {
    const x = dcfExitMultiple([100, 110], 200, 0.09, 8, 0, 1000, false);
    const g = x.impliedGrowth;
    expect((110 * (1 + g)) / (0.09 - g)).toBeCloseTo(x.terminalValue, 6);
    // con mitad de año: el Gordon con ese g, descontado a N − 0,5, da el mismo VA que el múltiplo a N
    const m = dcfExitMultiple([100, 110], 200, 0.09, 8, 0, 1000);
    const tvG = (110 * (1 + m.impliedGrowth)) / (0.09 - m.impliedGrowth);
    expect(tvG / 1.09 ** 1.5).toBeCloseTo(m.pvTerminalValue, 6);
    // y el múltiplo implícito en un Gordon devuelve su mismo VA
    const gd = dcfGordon([100, 110], 0.09, 0.02, 0, 1000);
    const mult = impliedExitMultiple(gd.terminalValue, 200, 0.09);
    expect((mult * 200) / 1.09 ** 2).toBeCloseTo(gd.pvTerminalValue, 6);
    expect(impliedExitMultiple(gd.terminalValue, 200, 0.09, false)).toBeCloseTo(
      gd.terminalValue / 200,
      12,
    );
  });
  it('Monte Carlo determinista por semilla', () => {
    const spec = {
      seed: 7,
      iterations: 200,
      growthShiftSd: 0.01,
      marginShiftSd: 0.01,
      waccSd: 0.005,
      terminalGrowthMin: 0.01,
      terminalGrowthMode: 0.02,
      terminalGrowthMax: 0.03,
      minSpread: 0.02,
      referencePrice: 5,
    };
    const a = monteCarloDcf(last, ops, 0.09, 0, 1_000_000, spec);
    expect(monteCarloDcf(last, ops, 0.09, 0, 1_000_000, spec)).toEqual(a);
    expect(a.p5).toBeLessThan(a.p95);
  });
});

describe('LBO', () => {
  const base: LboAssumptions = {
    offerPricePerShare: 10,
    unaffectedPricePerShare: 8,
    shares: 1_000_000,
    exitMultiple: 8,
    transactionFeePct: 0.02,
    financingFeePct: 0.02,
    minCash: 500,
    sweepPct: 1,
    interestCapPct: 0.3,
    interestCapFloor: 100,
    tranches: [
      {
        id: 'a',
        name: 'A',
        multiple: 2,
        cashRate: 0.06,
        pikRate: 0,
        mandatoryAmortPct: 0.1,
        sweepPriority: 1,
      },
      {
        id: 'm',
        name: 'M',
        multiple: 1,
        cashRate: 0,
        pikRate: 0.12,
        mandatoryAmortPct: 0,
        sweepPriority: null,
      },
    ],
    operating: { ...ops, debtRepayment: [0, 0, 0] },
  };
  it('cuadra fuentes y usos; el PIK crece y el senior se barre', () => {
    const r = buildLbo(last, base);
    expect(r.totalSources).toBe(r.totalUses);
    expect(at(r.years, 0).deuda_final.m ?? 0).toBeGreaterThan(at(r.years, 0).deuda_inicial.m ?? 0);
    expect(at(r.years, -1).deuda_final.a ?? 0).toBeLessThan(at(r.years, 0).deuda_inicial.a ?? 0);
  });
  it('arrastra el exceso de gastos financieros no deducible (art. 16 LIS)', () => {
    const r = buildLbo(last, { ...base, interestCapPct: 0.05, interestCapFloor: 0 });
    expect(at(r.years, 0).exceso_no_deducido_pendiente).toBeGreaterThan(0);
  });
  it('si el senior se repaga, la caja sobrante se acumula', () => {
    const r = buildLbo(last, {
      ...base,
      tranches: [{ ...at(base.tranches, 0), multiple: 0.2 }],
    });
    expect(at(r.years, -1).deuda_total_final).toBe(0);
    expect(at(r.years, -1).caja_final).toBeGreaterThan(base.minCash);
  });
  it('falla si la caja no cubre la amortización obligatoria', () => {
    expect(() =>
      buildLbo(last, {
        ...base,
        tranches: [{ ...at(base.tranches, 0), multiple: 6, mandatoryAmortPct: 0.5 }],
      }),
    ).toThrow(RangeError);
  });
});

describe('merger model', () => {
  const acq = {
    name: 'C',
    sharePrice: 20,
    sharesThousands: 1000,
    netIncome: [1500, 1600],
    cash: 1000,
    debt: 0,
    taxRate: 0.25,
    interestOnCash: 0.02,
    costOfNewDebt: 0.05,
  };
  const deal = {
    offerPricePerShare: 12,
    unaffectedPricePerShare: 10,
    targetShares: 1_000_000,
    cashPct: 1,
    cashFromBalancePct: 1,
    runRateSynergies: 0,
    synergyPhaseIn: [1, 1],
    identifiedIntangibles: 0,
    intangibleLifeYears: 10,
    advisoryFeePct: 0,
    financingFeePct: 0,
    financingFeeAmortYears: 1,
  };
  const target = { lastYear: last, netIncome: [1000, 1000], years: [2026, 2027] };
  it('todo en efectivo de caja: no hay acciones nuevas y la acreción sale del rendimiento perdido', () => {
    const r = buildMerger(acq, target, deal);
    expect(r.consideration.newShares).toBe(0);
    const ni = 1500 + 1000 - 12000 * 0.02 * 0.75;
    expect(at(r.years, 0).accretionDilution).toBeCloseTo(ni / 1000 / 1.5 - 1, 12);
  });
  it('si ya acrece sin sinergias, las de equilibrio son 0; la comisión solo se amortiza su plazo', () => {
    const r = buildMerger(acq, target, { ...deal, financingFeePct: 0.01, cashFromBalancePct: 0 });
    expect(at(r.years, 0).breakevenSynergies).toBe(0);
    expect(at(r.years, 0).financingFeeAmortAfterTax).toBeGreaterThan(0);
    expect(at(r.years, 1).financingFeeAmortAfterTax).toBe(0);
  });
});
