/*
 * Los modelos de referencia de /content/shared/models cuadran (skill modelo-referencia):
 * balance, caja, TIR recalculada, fuentes = usos y acreción/dilución. Las comprobaciones se hacen
 * sobre el JSON guardado y con fórmulas propias del test, no con las del motor.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import companiesJson from '../../content/shared/companies.json';
import { checkCompany } from './accounting';
import { companiesSchema } from './schemas';
import { buildModels } from './reference-models';

/* eslint-disable @typescript-eslint/no-explicit-any -- el test lee JSON libre a propósito */
const load = (name: string): any =>
  JSON.parse(readFileSync(`content/shared/models/naranjas-del-turia-${name}.json`, 'utf8'));
const ts = load('3-estados');
const dcf = load('dcf');
const lbo = load('lbo');
const mg = load('merger');
const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
const close = (a: number, b: number, tol = 1e-3) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

/** TIR del test (Newton-Raphson), independiente de la bisección del motor. */
function newtonIrr(cfs: number[], guess = 0.1): number {
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const f = cfs.reduce((s, c, t) => s + c / (1 + r) ** t, 0);
    const df = cfs.reduce((s, c, t) => s - (t * c) / (1 + r) ** (t + 1), 0);
    const next = r - f / df;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }
  return r;
}

describe('los JSON coinciden con el generador (sin deriva)', () => {
  it.each(Object.entries(buildModels()))('%s', (file, model) => {
    expect(JSON.parse(readFileSync(`content/shared/models/${file}`, 'utf8'))).toEqual(
      JSON.parse(JSON.stringify(model)),
    );
  });

  it('todos son borradores con versión, fuentes y fecha de verificación', () => {
    for (const m of [ts, dcf, lbo, mg]) {
      expect(m.status).toBe('draft');
      expect(m.version).toBeGreaterThanOrEqual(1);
      expect(m.sources.length).toBeGreaterThan(0);
      expect(m.verificarAntesDe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('3 estados', () => {
  const ndt = companiesSchema.parse(companiesJson).find((c) => c.id === 'naranjas-del-turia')!;

  it('parte del último año real de companies.json', () => {
    expect(ts.historical.at(-1)).toEqual(ndt.years.at(-1));
  });

  it('pasa todas las comprobaciones contables de companies.json (2025 real + 2026–2030)', () => {
    const issues = checkCompany({ ...ndt, years: [ndt.years.at(-1)!, ...ts.projection] });
    expect(issues).toEqual([]);
  });

  it('el balance cuadra y la caja reconcilia en cada año', () => {
    let prevCash = ndt.years.at(-1)!.balance.caja;
    for (const y of ts.projection) {
      const b = y.balance;
      expect(b.total_activo).toBe(b.total_pasivo + b.total_patrimonio);
      expect(b.caja).toBe(prevCash + y.flujos.variacion_caja);
      prevCash = b.caja;
    }
    expect(ts.checks.every((c: any) => c.balance === 0 && c.caja === 0)).toBe(true);
  });

  it('los drivers se respetan (márgenes, días de circulante, payout)', () => {
    for (const y of ts.projection) {
      close(y.pyg.coste_ventas / y.pyg.ingresos, 0.62, 1e-4);
      close((y.balance.clientes / y.pyg.ingresos) * 365, 60, 0.01);
      close(y.dividendos / y.pyg.resultado_neto, 0.45, 1e-4);
    }
  });
});

describe('DCF', () => {
  const w = dcf.assumptions.wacc;
  const proj = ts.projection;
  // WACC sin redondear (el JSON lo guarda con 6 decimales)
  const de = w.targetDebtToCapital / (1 - w.targetDebtToCapital);
  const bl = w.unleveredBeta * (1 + (1 - w.taxRate) * de);
  const ke = w.riskFree + bl * w.equityRiskPremium + w.sizePremium;
  const wacc =
    (1 - w.targetDebtToCapital) * ke + w.targetDebtToCapital * w.preTaxCostOfDebt * (1 - w.taxRate);

  it('WACC recalculado con Hamada', () => {
    close(dcf.wacc.leveredBeta, bl, 1e-6);
    close(dcf.wacc.wacc, wacc, 1e-6);
  });

  it('FCFF = EBIT × (1 − t) + amortización − capex − Δ circulante, desde el modelo de 3 estados', () => {
    let prev = ts.historical.at(-1).balance;
    proj.forEach((y: any, i: number) => {
      const b = y.balance;
      const dNwc =
        b.clientes +
        b.existencias -
        b.proveedores -
        (prev.clientes + prev.existencias - prev.proveedores);
      const capex = -y.flujos.inversion;
      close(
        dcf.fcff[i].fcff,
        y.pyg.ebit * (1 - w.taxRate) + y.pyg.amortizacion - capex - dNwc,
        1e-6,
      );
      prev = b;
    });
  });

  it('EV, valor del patrimonio y precio por acción recalculados (mitad de año, Gordon)', () => {
    const r = wacc;
    const g = dcf.assumptions.terminalGrowth;
    const f = dcf.fcff.map((x: any) => x.fcff);
    const pv = f.reduce((s: number, x: number, i: number) => s + x / (1 + r) ** (i + 0.5), 0);
    const tv = (f.at(-1) * (1 + g)) / (r - g);
    const ev = pv + tv / (1 + r) ** 4.5;
    const eq = ev - dcf.assumptions.netDebt;
    close(dcf.valuation.gordon.enterpriseValue, ev, 1e-2);
    close(
      dcf.valuation.gordon.pricePerShare,
      (eq * 1000) / dcf.assumptions.sharesOutstanding,
      1e-4,
    );
    expect(dcf.assumptions.netDebt).toBe(12000 - 15385);
  });

  it('las sensibilidades tienen el caso base en el centro y se mueven en la dirección correcta', () => {
    const s = dcf.sensitivity.priceByWaccAndGrowth;
    close(s.rows[2], dcf.wacc.wacc, 1e-6);
    close(s.values[2][2], dcf.valuation.gordon.pricePerShare, 1e-4);
    close(
      dcf.sensitivity.priceByWaccAndExitMultiple.values[2][2],
      dcf.valuation.exitMultiple.pricePerShare,
      1e-4,
    );
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 4; j++) {
        expect(s.values[i][j + 1]).toBeGreaterThan(s.values[i][j]); // más g → más valor
        expect(s.values[j + 1][i]).toBeLessThan(s.values[j][i]); // más WACC → menos valor
      }
  });

  it('múltiplo y crecimiento implícitos reconcilian el VA del valor terminal (mitad de año)', () => {
    const g = dcf.valuation.gordon;
    const x = dcf.valuation.exitMultiple;
    const ebitda = ts.projection.at(-1).pyg.ebit + ts.projection.at(-1).pyg.amortizacion;
    const f = dcf.fcff.at(-1).fcff;
    // Gordon → múltiplo implícito, descontado a N como el método del múltiplo
    close(
      (dcf.valuation.impliedExitMultipleFromGordon * ebitda) / (1 + wacc) ** 5,
      g.pvTerminalValue,
      2,
    );
    // múltiplo → g implícito, descontado a N − 0,5 como Gordon
    const ig = x.impliedGrowth;
    close((f * (1 + ig)) / (wacc - ig) / (1 + wacc) ** 4.5, x.pvTerminalValue, 2);
  });

  it('Monte Carlo: percentiles ordenados y mediana cerca del caso base', () => {
    const m = dcf.monteCarlo.result;
    expect(m.p5).toBeLessThan(m.p25);
    expect(m.p25).toBeLessThan(m.p50);
    expect(m.p50).toBeLessThan(m.p75);
    expect(m.p75).toBeLessThan(m.p95);
    expect(Math.abs(m.p50 / dcf.valuation.gordon.pricePerShare - 1)).toBeLessThan(0.05);
  });
});

describe('LBO', () => {
  const r = lbo.results;

  it('fuentes = usos y el capital del fondo es la partida de cierre', () => {
    expect(sum(r.sources)).toBe(sum(r.uses));
    expect(r.totalSources).toBe(r.totalUses);
    expect(r.entry.enterpriseValue).toBe(r.entry.equityPurchasePrice + r.entry.netDebtTarget);
  });

  it('calendario de deuda: saldo final = inicial + PIK − amortización − barrido, nunca negativo', () => {
    const tr = lbo.assumptions.tranches;
    r.years.forEach((y: any, i: number) => {
      let mandatory = 0;
      let swept = 0;
      for (const t of tr) {
        const pik = Math.round(y.deuda_inicial[t.id] * t.pikRate);
        const delta = y.deuda_inicial[t.id] + pik - y.deuda_final[t.id];
        expect(y.deuda_final[t.id]).toBeGreaterThanOrEqual(0);
        if (i > 0) expect(y.deuda_inicial[t.id]).toBe(r.years[i - 1].deuda_final[t.id]);
        mandatory += Math.min(
          delta,
          Math.round(sum(r.sources.filter((s: any) => s.id === t.id)) * t.mandatoryAmortPct),
        );
        swept += delta;
      }
      expect(mandatory).toBe(y.amortizacion_obligatoria);
      expect(swept - mandatory).toBe(y.barrido);
      expect(y.caja_final).toBe(
        y.caja_inicial + y.flujo_caja_libre - y.amortizacion_obligatoria - y.barrido,
      );
      expect(y.caja_final).toBeGreaterThanOrEqual(lbo.assumptions.minCash);
    });
  });

  it('TIR recalculada por Newton y VAN nulo a la TIR guardada', () => {
    const cfs = [-r.sponsorEquity, 0, 0, 0, 0, r.exit.equityValue];
    expect(r.cashflows).toEqual(cfs);
    close(newtonIrr(cfs), r.irr, 1e-6);
    const npvAtIrr = cfs.reduce((s, c, t) => s + c / (1 + r.irr) ** t, 0);
    expect(Math.abs(npvAtIrr)).toBeLessThan(1);
    close(r.moic, r.exit.equityValue / r.sponsorEquity, 1e-6);
    close(r.irr, r.moic ** (1 / 5) - 1, 1e-6); // sin flujos intermedios, TIR = MOIC^(1/n) − 1
  });

  it('salida: EV − deuda neta = patrimonio; el puente de valor explica toda la ganancia', () => {
    expect(r.exit.equityValue).toBe(r.exit.enterpriseValue - r.exit.netDebt);
    const b = r.bridge;
    close(
      b.ebitdaGrowth + b.multipleChange + b.deleveraging + b.fees,
      r.exit.equityValue - r.sponsorEquity,
      1e-3,
    );
  });

  it('art. 16.5 LIS: deuda ≤ 70 % del precio y reducción proporcional a 8 años hacia el 30 %', () => {
    const t = lbo.acquisitionDebtTest;
    const debt = sum(
      r.sources.filter((x: any) => !['caja_sociedad', 'capital_fondo'].includes(x.id)),
    );
    expect(t.initialDebt).toBe(debt);
    expect(debt).toBeLessThanOrEqual(0.7 * r.entry.equityPurchasePrice);
    r.years.forEach((y: any, i: number) => {
      const max = debt - ((debt - 0.3 * r.entry.equityPurchasePrice) * (i + 1)) / 8;
      expect(y.deuda_total_final).toBeLessThanOrEqual(max);
    });
    expect(t.allOk).toBe(true);
  });

  it('hipótesis que no aplican en el LBO van a 0', () => {
    expect(lbo.assumptions.operating.payout).toBe(0);
    expect(lbo.assumptions.operating.costOfDebt).toBe(0);
  });

  it('límite de gastos financieros del art. 16 LIS aplicado', () => {
    for (const y of r.years) {
      const cap = Math.max(1000, Math.round(y.ebitda * 0.3));
      expect(y.gasto_financiero_deducible).toBeLessThanOrEqual(cap);
      expect(y.impuestos).toBe(Math.round((y.ebit - y.gasto_financiero_deducible) * 0.25));
    }
  });

  it('sensibilidades: centro = caso base y TIR creciente con el múltiplo de salida', () => {
    const s = lbo.sensitivity.irrByEntryAndExitMultiple;
    close(s.values[2][2], r.irr, 1e-6);
    close(lbo.sensitivity.irrByLeverageAndExitMultiple.values[2][2], r.irr, 1e-6);
    for (const row of s.values)
      for (let j = 0; j < 4; j++) expect(row[j + 1]).toBeGreaterThan(row[j]);
  });
});

describe('Merger model', () => {
  const r = mg.results;
  const a = mg.acquirer;
  const d = mg.deal;

  it('fuentes = usos y contraprestación coherente', () => {
    close(sum(r.sources), sum(r.uses), 1e-6);
    close(r.purchase.equityValue, (d.offerPricePerShare * d.targetShares) / 1000, 1e-9);
    close(r.consideration.newShares, r.consideration.stock / a.sharePrice, 1e-9);
    const c = r.consideration;
    close(
      c.stockExchangeRatioPerTargetShare * a.sharePrice + c.cashPerTargetShare,
      d.offerPricePerShare,
      1e-9,
    );
    close(c.allStockExchangeRatio, d.offerPricePerShare / a.sharePrice, 1e-9);
  });

  it('PPA: fondo de comercio = precio − patrimonio contable − intangibles + pasivo por impuesto diferido', () => {
    const p = r.ppa;
    expect(p.targetBookEquity).toBe(ts.historical.at(-1).balance.total_patrimonio);
    close(
      p.goodwill,
      p.equityPurchasePrice -
        p.targetBookEquity -
        p.identifiedIntangibles +
        p.identifiedIntangibles * a.taxRate,
    );
  });

  it('acreción/dilución recalculada partida a partida', () => {
    const t = a.taxRate;
    const debt = sum(r.sources.filter((s: any) => s.id === 'deuda_nueva'));
    const fromCash = sum(r.sources.filter((s: any) => s.id === 'caja_compradora'));
    const fees = sum(r.uses.filter((u: any) => u.id === 'comisiones_financiacion'));
    r.years.forEach((y: any, i: number) => {
      expect(y.targetNetIncome).toBe(ts.projection[i].pyg.resultado_neto);
      const ni =
        a.netIncome[i] +
        y.targetNetIncome +
        d.runRateSynergies * d.synergyPhaseIn[i] * (1 - t) -
        fromCash * a.interestOnCash * (1 - t) -
        debt * a.costOfNewDebt * (1 - t) -
        (d.identifiedIntangibles / d.intangibleLifeYears) * (1 - t) -
        (fees / d.financingFeeAmortYears) * (1 - t);
      const shares = a.sharesThousands + r.consideration.newShares;
      close(y.proFormaNetIncome, ni, 1e-3);
      close(y.accretionDilution, ni / shares / (a.netIncome[i] / a.sharesThousands) - 1, 1e-6);
    });
  });

  it('las sinergias de equilibrio dejan la operación neutra en BPA', () => {
    r.years.forEach((y: any) => {
      const ni = y.proFormaNetIncome - y.synergiesAfterTax + y.breakevenSynergies * (1 - a.taxRate);
      close(ni / y.proFormaShares, y.standaloneEps, 1e-9);
    });
  });

  it('sensibilidades: centro = caso base; más sinergias → más acreción; más acciones → menos acreción el año 1', () => {
    const s = mg.sensitivity.year1AccretionByOfferAndSynergies;
    close(s.values[2][2], r.years[0].accretionDilution, 1e-6);
    for (const row of s.values)
      for (let j = 0; j < 4; j++) expect(row[j + 1]).toBeGreaterThan(row[j]);
    const mix = mg.sensitivity.accretionByCashMix;
    close(mix.values[2][0], r.years[0].accretionDilution, 1e-6);
    for (let i = 0; i < 4; i++) expect(mix.values[i + 1][0]).toBeLessThan(mix.values[i][0]);
  });
});
