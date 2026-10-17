/*
 * Modelos de referencia de Naranjas del Turia: hipótesis + resultados, listos para guardar en
 * /content/shared/models/. Son la «respuesta oficial» con la que se generan y corrigen los ejercicios
 * del Modelo por piezas (TEMARIO §3). Fecha de valoración: 31/12/2025 (último año real de companies.json).
 * Las hipótesis de mercado (tipo libre de riesgo, prima de riesgo, beta, precio de cotización) son
 * didácticas y se marcan para verificar antes de publicar.
 */
import companiesJson from '../../content/shared/companies.json';
import {
  at,
  axis5,
  buildLbo,
  buildMerger,
  computeWacc,
  dcfExitMultiple,
  dcfGordon,
  fcffFromProjection,
  impliedExitMultiple,
  monteCarloDcf,
  projectThreeStatements,
  rd,
  type AcquirerInputs,
  type LboAssumptions,
  type MergerDeal,
  type MonteCarloSpec,
  type StatementYear,
  type ThreeStatementAssumptions,
  type WaccInputs,
} from '../engine/models';

export const MODEL_VERSION = 1;
const VALUATION_DATE = '2025-12-31';
const VERIFY_BEFORE = '2027-04-17';
const COMPANY_ID = 'naranjas-del-turia';

interface CompanyLike {
  id: string;
  sharesOutstanding: number;
  years: StatementYear[];
}

export function naranjas(): CompanyLike {
  const c = (companiesJson as unknown as CompanyLike[]).find((x) => x.id === COMPANY_ID);
  if (!c) throw new Error('Falta Naranjas del Turia en companies.json');
  return c;
}

/** Último año real: punto de partida de todas las proyecciones. */
export const lastActual = (): StatementYear => naranjas().years.at(-1)!;

// ───────────── hipótesis ─────────────

/** Caso base: prolonga las ratios históricas 2021–2025 (ver `rationale`). */
export const BASE_CASE: ThreeStatementAssumptions = {
  revenueGrowth: [0.065, 0.06, 0.055, 0.05, 0.045],
  cogsPct: [0.62, 0.62, 0.62, 0.62, 0.62],
  opexPct: [0.18, 0.18, 0.18, 0.18, 0.18],
  daPctOpeningPPE: 0.08,
  capexPct: 0.055,
  dso: 60,
  dio: 70,
  dpo: 50,
  costOfDebt: 0.045,
  taxRate: 0.25,
  payout: 0.45,
  debtRepayment: [1500, 1500, 1500, 1500, 1500],
};

const BASE_RATIONALE = {
  revenueGrowth:
    'Histórico 2021–2025: TACC del 7,2 % (44.520 → 58.882) y +7,0 % en 2025. Se desacelera 0,5 pp al año hacia el crecimiento nominal de una empresa madura.',
  cogsPct: 'Coste de ventas = 62,0 % de los ingresos en los cinco años reales.',
  opexPct:
    'Gastos operativos (sin amortización) = 18,0 % de los ingresos en los cinco años reales.',
  daPctOpeningPPE:
    'Amortización = 8,0 % del inmovilizado inicial en 2022–2025 (p. ej. 1.682 / 21.030 en 2025).',
  capexPct:
    'Capex medio 2021–2025 = 4,9 % de los ingresos, con 5,9 % en 2023 y 2025; se toma 5,5 % por el plan de nuevas líneas de zumo.',
  dso: 'Clientes / ingresos = 16,44 % en 2024 y 2025 → 60 días sobre 365.',
  dio: 'Existencias / coste de ventas = 19,18 % → 70 días.',
  dpo: 'Proveedores / coste de ventas = 13,70 % → 50 días.',
  costOfDebt:
    'Gastos financieros = 4,5 % de la deuda inicial en 2023–2025. Se calcula sobre la deuda inicial para evitar la circularidad.',
  taxRate:
    'Tipo general del impuesto sobre sociedades: 25 % (art. 29 LIS); coincide con el tipo efectivo histórico.',
  payout: 'Dividendo = 45 % del resultado neto del ejercicio en los cinco años reales.',
  debtRepayment:
    'Hipótesis: amortización lineal de 1.500 al año del préstamo bancario; sin deuda nueva.',
  cash: 'La caja es la partida de cierre (sale del estado de flujos). Simplificación: la caja no se remunera.',
};

export const WACC_INPUTS: WaccInputs = {
  riskFree: 0.0325,
  equityRiskPremium: 0.055,
  sizePremium: 0.02,
  unleveredBeta: 0.65,
  targetDebtToCapital: 0.2,
  preTaxCostOfDebt: 0.045,
  taxRate: 0.25,
};

const WACC_RATIONALE = {
  riskFree:
    'Hipótesis: rentabilidad del Bono del Estado a 10 años en torno al 3,25 % a la fecha de valoración. Verificar el dato en el Tesoro Público o el Banco de España antes de publicar.',
  equityRiskPremium:
    'Hipótesis: prima de mercado maduro más prima país de España en el rango que publica Damodaran. Verificar en su página de primas por país.',
  sizePremium:
    'Hipótesis discutida: prima por tamaño y baja liquidez de una cotizada pequeña. Muchos manuales la cuestionan; el ejercicio enseña a defenderla o quitarla.',
  unleveredBeta:
    'Hipótesis: beta desapalancada de procesado de alimentos en Europa (Damodaran, Betas by Sector). Verificar.',
  targetDebtToCapital:
    'Estructura objetivo del sector (hipótesis), no la actual (Naranjas tiene caja neta).',
  preTaxCostOfDebt: 'Coste histórico de su préstamo (4,5 %).',
};

const TERMINAL_GROWTH = 0.02;
const EXIT_MULTIPLE_DCF = 9.0;
/** Hipótesis de cotización no afectada a la fecha de valoración (supuesto didáctico). */
export const UNAFFECTED_PRICE = 7.5;

export const MONTE_CARLO: MonteCarloSpec = {
  seed: 20251231,
  iterations: 5000,
  growthShiftSd: 0.015,
  marginShiftSd: 0.015,
  waccSd: 0.0075,
  terminalGrowthMin: 0.01,
  terminalGrowthMode: 0.02,
  terminalGrowthMax: 0.025,
  minSpread: 0.02,
  referencePrice: UNAFFECTED_PRICE,
};

const SPONSOR = { name: 'Marjal Capital Partners', ficticio: true, pendienteVerificarCNMV: true };

export const LBO_ASSUMPTIONS: LboAssumptions = {
  offerPricePerShare: 9.375,
  unaffectedPricePerShare: UNAFFECTED_PRICE,
  shares: 12_000_000,
  exitMultiple: 9.0,
  transactionFeePct: 0.02,
  financingFeePct: 0.025,
  minCash: 3000,
  sweepPct: 1,
  interestCapPct: 0.3,
  interestCapFloor: 1000,
  tranches: [
    {
      id: 'senior_a',
      name: 'Préstamo senior A (amortizable)',
      multiple: 2.0,
      cashRate: 0.06,
      pikRate: 0,
      mandatoryAmortPct: 0.1,
      sweepPriority: 1,
    },
    {
      id: 'senior_b',
      name: 'Préstamo senior B (TLB, casi bullet)',
      multiple: 1.75,
      cashRate: 0.07,
      pikRate: 0,
      mandatoryAmortPct: 0.01,
      sweepPriority: 2,
    },
    {
      id: 'mezzanine',
      name: 'Mezzanine con interés capitalizado (PIK)',
      multiple: 0.75,
      cashRate: 0,
      pikRate: 0.12,
      mandatoryAmortPct: 0,
      sweepPriority: null,
    },
  ],
  operating: {
    ...BASE_CASE,
    // Plan de creación de valor del fondo: compras centralizadas y automatización del envasado.
    opexPct: [0.178, 0.175, 0.172, 0.17, 0.17],
    payout: 0,
    costOfDebt: 0,
    debtRepayment: [0, 0, 0, 0, 0],
  },
};

const TARGET_IRR = 0.2;

/** Formato español para las notas: 13,2 y 8,08. */
const es = (x: number, d: number) => x.toFixed(d).replace('.', ',');

export const ACQUIRER: AcquirerInputs = {
  name: 'Grupo Azahar Calderona S.A.',
  sharePrice: 21,
  sharesThousands: 60_000,
  netIncome: [90_000, 95_400, 100_170],
  cash: 80_000,
  debt: 150_000,
  taxRate: 0.25,
  interestOnCash: 0.02,
  costOfNewDebt: 0.05,
};

export const MERGER_DEAL: MergerDeal = {
  offerPricePerShare: 10.5,
  unaffectedPricePerShare: UNAFFECTED_PRICE,
  targetShares: 12_000_000,
  cashPct: 0.5,
  cashFromBalancePct: 0.4,
  runRateSynergies: 3000,
  synergyPhaseIn: [0.5, 1, 1],
  identifiedIntangibles: 25_000,
  intangibleLifeYears: 10,
  advisoryFeePct: 0.015,
  financingFeePct: 0.01,
  financingFeeAmortYears: 5,
};

// ───────────── fuentes ─────────────

const SRC = {
  rosenbaum: (cap: string) => ({
    tipo: 'manual',
    referencia: `Rosenbaum y Pearl, Investment Banking: Valuation, LBOs, M&A and IPOs, ${cap}`,
  }),
  koller: (cap: string) => ({
    tipo: 'manual',
    referencia: `Koller, Goedhart y Wessels, Valuation (McKinsey), ${cap}`,
  }),
  berk: (cap: string) => ({
    tipo: 'manual',
    referencia: `Berk y DeMarzo, Corporate Finance, ${cap}`,
  }),
  lis: (art: string) => ({
    tipo: 'oficial',
    referencia: `Ley 27/2014, del Impuesto sobre Sociedades, ${art}`,
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328',
  }),
  damodaran: {
    tipo: 'datos',
    referencia: 'Damodaran Online: betas por sector (Europa) y primas de riesgo por país',
    url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html',
  },
  tesoro: {
    tipo: 'oficial',
    referencia: 'Tesoro Público: rentabilidad de los Bonos y Obligaciones del Estado',
    url: 'https://www.tesoro.es/',
  },
  bce: {
    tipo: 'oficial',
    referencia:
      'BCE, estrategia de política monetaria: objetivo de inflación del 2 % a medio plazo',
    url: 'https://www.ecb.europa.eu/mopo/strategy/html/index.es.html',
  },
  nic36: {
    tipo: 'oficial',
    referencia:
      'NIC 36 Deterioro del valor de los activos (NIIF-UE): test anual del fondo de comercio',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1803',
  },
  pgc: {
    tipo: 'oficial',
    referencia:
      'Plan General de Contabilidad (RD 1514/2007, modificado por el RD 602/2016) y art. 39.4 del Código de Comercio: amortización del fondo de comercio en 10 años salvo prueba en contrario',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-19884',
  },
  lsc: {
    tipo: 'oficial',
    referencia: 'Ley de Sociedades de Capital (RDL 1/2010), art. 150: asistencia financiera',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544',
  },
  rdl52023: {
    tipo: 'oficial',
    referencia:
      'RDL 5/2023, Libro primero (modificaciones estructurales), art. 42: fusión posterior a una adquisición con endeudamiento',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-15135',
  },
  niif3: {
    tipo: 'oficial',
    referencia:
      'NIIF 3 Combinaciones de negocios (NIIF-UE): método de adquisición y fondo de comercio',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R1803',
  },
};

const common = (type: string, title: string, skills: string[]) => ({
  id: `${COMPANY_ID}-${type}`,
  version: MODEL_VERSION,
  status: 'draft' as const,
  company: COMPANY_ID,
  type,
  title,
  unit: 'miles de € (salvo importes por acción, en €)',
  valuationDate: VALUATION_DATE,
  generatedBy: 'scripts/build-models.ts (npm run models:build)',
  skills,
  verificarAntesDe: VERIFY_BEFORE,
});

// ───────────── construcción ─────────────

export function buildModels(): Record<string, unknown> {
  const c = naranjas();
  const last = lastActual();
  const shares = c.sharesOutstanding;
  const netDebt = last.balance.deuda - last.balance.caja;

  // 3 estados
  const proj = projectThreeStatements(last, BASE_CASE);
  const threeStatement = {
    ...common('3-estados', 'Naranjas del Turia — modelo de 3 estados 2026–2030', [
      'modelo-referencia',
      'financial-services: 3-statement-model',
      'knowledge-work finance: financial-statements',
    ]),
    sources: [
      SRC.rosenbaum('modelo de 3 estados en el cap. 5 (LBO)'),
      SRC.koller('caps. sobre reorganizar los estados y proyectar'),
      SRC.lis('art. 29'),
    ],
    assumptions: BASE_CASE,
    rationale: BASE_RATIONALE,
    historical: c.years,
    projection: proj,
    checks: proj.map((y, i) => ({
      year: y.year,
      balance: y.balance.total_activo - y.balance.total_pasivo - y.balance.total_patrimonio,
      caja:
        y.balance.caja -
        ((i === 0 ? last : at(proj, i - 1)).balance.caja + y.flujos.variacion_caja),
    })),
    notes: [
      'Mismo esquema que companies.json: checkCompany se aplica a 2025 real + 2026–2030 proyectados.',
      'Intereses sobre la deuda inicial y caja no remunerada: el modelo no tiene circularidad. En la rama Pro se enseña la versión con intereses sobre saldo medio y cálculo iterativo.',
    ],
  };

  // DCF
  const w = computeWacc(WACC_INPUTS);
  const fcffRows = fcffFromProjection(proj, BASE_CASE.taxRate);
  const fcff = fcffRows.map((r) => r.fcff);
  const lastEbitda = proj.at(-1)!.ebitda;
  const gordon = dcfGordon(fcff, w.wacc, TERMINAL_GROWTH, netDebt, shares);
  const exit = dcfExitMultiple(fcff, lastEbitda, w.wacc, EXIT_MULTIPLE_DCF, netDebt, shares);
  const waccAxis = axis5(w.wacc, 0.005);
  const gAxis = axis5(TERMINAL_GROWTH, 0.005);
  const multAxis = axis5(EXIT_MULTIPLE_DCF, 1);
  const mc = monteCarloDcf(last, BASE_CASE, w.wacc, netDebt, shares, MONTE_CARLO);
  const dcf = {
    ...common('dcf', 'Naranjas del Turia — DCF con sensibilidades y Monte Carlo', [
      'modelo-referencia',
      'financial-services: dcf-model',
      'creating-financial-models (sensibilidad y Monte Carlo)',
    ]),
    sources: [
      SRC.rosenbaum('cap. 3 (DCF): convención de mitad de año y valor terminal'),
      SRC.koller('caps. sobre FCF, WACC y valor continuo'),
      SRC.berk('caps. sobre coste de capital y valoración'),
      SRC.damodaran,
      SRC.tesoro,
      SRC.bce,
    ],
    threeStatementModel: `${COMPANY_ID}-3-estados`,
    assumptions: {
      wacc: WACC_INPUTS,
      terminalGrowth: TERMINAL_GROWTH,
      exitMultiple: EXIT_MULTIPLE_DCF,
      midYearConvention: true,
      netDebt,
      sharesOutstanding: shares,
      unaffectedPrice: UNAFFECTED_PRICE,
    },
    rationale: {
      ...WACC_RATIONALE,
      terminalGrowth:
        'g = 2 %, igual al objetivo de inflación del BCE (crecimiento real nulo a perpetuidad): conservador y por debajo del PIB nominal a largo plazo, que es el tope razonable.',
      exitMultiple:
        'Contraste por múltiplo EV/EBITDA de salida (hipótesis de comparables del sector).',
      netDebt:
        'Deuda 12.000 − caja 15.385 = −3.385: caja neta, que suma al valor del patrimonio. Simplificación: toda la caja se trata como no operativa; en el LBO se retienen 3.000 como caja mínima.',
    },
    wacc: w,
    fcff: fcffRows,
    valuation: {
      gordon,
      exitMultiple: exit,
      impliedExitMultipleFromGordon: impliedExitMultiple(gordon.terminalValue, lastEbitda, w.wacc),
    },
    sensitivity: {
      priceByWaccAndGrowth: {
        rows: waccAxis,
        cols: gAxis,
        values: waccAxis.map((wa) =>
          gAxis.map((g) => rd(dcfGordon(fcff, wa, g, netDebt, shares).pricePerShare, 4)),
        ),
      },
      priceByWaccAndExitMultiple: {
        rows: waccAxis,
        cols: multAxis,
        values: waccAxis.map((wa) =>
          multAxis.map((m) =>
            rd(dcfExitMultiple(fcff, lastEbitda, wa, m, netDebt, shares).pricePerShare, 4),
          ),
        ),
      },
    },
    monteCarlo: { spec: MONTE_CARLO, result: mc },
    notes: [
      `El valor terminal pesa ${es(gordon.terminalValueShareOfEv * 100, 1)} % del EV (por encima del 75 % que la skill dcf-model marca como dependencia alta): buen ejercicio de crítica.`,
      'Gordon descontado a N − 0,5 con mitad de año; múltiplo de salida a N (Rosenbaum y Pearl).',
      'Los dos métodos de valor terminal no coinciden: el múltiplo implícito en Gordon y el crecimiento implícito en el múltiplo se guardan para enseñar a reconciliarlos.',
    ],
  };

  // LBO
  const lbo = buildLbo(last, LBO_ASSUMPTIONS);
  const entryAxis = axis5(lbo.entry.entryMultiple, 0.5);
  const exitAxis = axis5(LBO_ASSUMPTIONS.exitMultiple, 0.5);
  const levAxis = [3.5, 4.0, 4.5, 5.0, 5.5];
  const baseLev = LBO_ASSUMPTIONS.tranches.reduce((s, t) => s + t.multiple, 0);
  const ltm = lbo.entry.ltmEbitda;
  const priceForEntryMultiple = (m: number) =>
    ((m * ltm - lbo.entry.netDebtTarget) * 1000) / LBO_ASSUMPTIONS.shares;
  const withLev = (lev: number): LboAssumptions => ({
    ...LBO_ASSUMPTIONS,
    tranches: LBO_ASSUMPTIONS.tranches.map((t) => ({
      ...t,
      multiple: (t.multiple * lev) / baseLev,
    })),
  });
  const maxPrice = maxOfferForIrr(last, LBO_ASSUMPTIONS, TARGET_IRR);
  const acq16 = acquisitionDebtTest(lbo.sources, lbo.entry.equityPurchasePrice, lbo.years);
  const lboModel = {
    ...common('lbo', 'Naranjas del Turia — LBO de Marjal Capital Partners (OPA de exclusión)', [
      'modelo-referencia',
      'financial-services: lbo-model',
      'financial-services: returns-analysis',
      'creating-financial-models (sensibilidad)',
    ]),
    sources: [
      SRC.rosenbaum('caps. 4 y 5 (LBO)'),
      SRC.lis('art. 16 (limitación de gastos financieros, incluido el 16.5) y art. 29'),
      SRC.lsc,
      SRC.rdl52023,
    ],
    sponsor: SPONSOR,
    assumptions: LBO_ASSUMPTIONS,
    rationale: {
      offerPricePerShare: 'Prima del 25 % sobre la cotización no afectada (7,50 €).',
      exitMultiple:
        'Salida en 2030 a 9,0x, algo por debajo del múltiplo de entrada: no se cuenta con expansión de múltiplo.',
      tranches:
        'Apalancamiento total 4,5x EBITDA: senior A 2,0x, TLB 1,75x y mezzanine PIK 0,75x (hipótesis de mercado de préstamos apalancados).',
      interestCap:
        'Art. 16 LIS: gastos financieros netos deducibles hasta el 30 % del beneficio operativo, con 1 millón de € deducible en todo caso. El exceso no deducido se deduce en ejercicios siguientes sin límite temporal; si un año los gastos netos no llegan al 30 %, la diferencia se suma al límite de los 5 años siguientes (el modelo no la necesita: no queda exceso pendiente). Beneficio operativo del art. 16.1 ≈ resultado de explotación + amortización ± deterioros y resultados por enajenación del inmovilizado; aquí se aproxima con el EBITDA.',
      operating:
        'Plan del fondo: gastos operativos del 18,0 % histórico al 17,8 % en 2026, bajando hasta el 17,0 % en 2029–2030. payout y costOfDebt van a 0 porque no aplican: no hay dividendos y los intereses se calculan por tramos.',
      minCash:
        'Caja mínima operativa de 3.000; el resto de la caja de la sociedad financia la compra.',
    },
    results: lbo,
    acquisitionDebtTest: acq16,
    targetIrr: TARGET_IRR,
    maxOfferPriceForTargetIrr: rd(maxPrice, 4),
    sensitivity: {
      irrByEntryAndExitMultiple: {
        rows: entryAxis,
        cols: exitAxis,
        values: entryAxis.map((em) =>
          exitAxis.map((xm) =>
            rd(
              buildLbo(last, {
                ...LBO_ASSUMPTIONS,
                offerPricePerShare: priceForEntryMultiple(em),
                exitMultiple: xm,
              }).irr,
              6,
            ),
          ),
        ),
      },
      irrByLeverageAndExitMultiple: {
        rows: levAxis,
        cols: exitAxis,
        values: levAxis.map((lev) =>
          exitAxis.map((xm) => rd(buildLbo(last, { ...withLev(lev), exitMultiple: xm }).irr, 6)),
        ),
      },
    },
    notes: [
      `TIR del ${es(lbo.irr * 100, 1)} %: por debajo del ${TARGET_IRR * 100} % que suele exigir un fondo. El precio máximo para ese objetivo (${es(maxPrice, 2)} €) solo da un ${es((maxPrice / UNAFFECTED_PRICE - 1) * 100, 1)} % de prima, poco para que los accionistas acepten una OPA de exclusión: el comité no aprobaría la oferta tal cual. Es el punto de partida del IC memo.`,
      'El fondo de comercio de la sociedad adquirente no afecta a la caja ni a la TIR; se trata en el merger model.',
      `Art. 16.5 LIS: si en los 4 años siguientes la adquirida se fusiona con la adquirente o entra en su grupo fiscal, los gastos financieros de la deuda de adquisición tienen un límite adicional del 30 % del beneficio operativo de la adquirente, sin incluir el de la adquirida. No se aplica si la deuda no supera el 70 % del precio y se reduce de forma proporcional en 8 años hasta el 30 % del precio. Aquí la deuda es el ${es(acq16.initialPct * 100, 1)} % del precio y en ${lbo.exit.year} baja al ${es(acq16.finalPct * 100, 1)} %, por debajo del máximo exigido cada año (ver acquisitionDebtTest): el modelo trata vehículo y objetivo como una sola sociedad y el cumplimiento queda pendiente de verificar con la norma vigente.`,
      'Simplificación: el modelo trata vehículo y objetivo como una sola sociedad. En España una S.A. no puede dar asistencia financiera para que un tercero compre sus acciones (art. 150 LSC). Por eso, en la realidad la caja de la objetivo no puede pagar el precio en el cierre: se usa después, mediante dividendos o tras la fusión. La deuda del vehículo pasa a la objetivo con una fusión apalancada posterior (RDL 5/2023, art. 42).',
    ],
  };

  // Merger model
  const targetNi = proj.slice(0, 3).map((y) => y.pyg.resultado_neto);
  const targetYears = proj.slice(0, 3).map((y) => y.year);
  const target = { lastYear: last, netIncome: targetNi, years: targetYears };
  const merger = buildMerger(ACQUIRER, target, MERGER_DEAL);
  const offerAxis = axis5(MERGER_DEAL.offerPricePerShare, 0.5);
  const synAxis = axis5(MERGER_DEAL.runRateSynergies, 1500);
  const mixAxis = [1, 0.75, 0.5, 0.25, 0];
  const mergerModel = {
    ...common('merger', 'Naranjas del Turia — merger model con Grupo Azahar Calderona', [
      'modelo-referencia',
      'financial-services: merger-model',
    ]),
    sources: [
      SRC.rosenbaum('cap. 7 (M&A del lado comprador: acreción/dilución)'),
      SRC.niif3,
      SRC.nic36,
      SRC.pgc,
      SRC.lis('art. 29'),
    ],
    acquirer: { ...ACQUIRER, ficticia: true, pendienteVerificarCNMV: true },
    target: {
      company: COMPANY_ID,
      netIncome: targetNi,
      years: targetYears,
      fromModel: `${COMPANY_ID}-3-estados`,
    },
    deal: MERGER_DEAL,
    rationale: {
      offerPricePerShare:
        'Prima del 40 % sobre 7,50 €: el comprador industrial paga más que el fondo gracias a las sinergias.',
      runRateSynergies:
        'Sinergias de costes (logística y compras) de 3.000 al año, al 50 % el primer año.',
      identifiedIntangibles:
        'PPA: marca y relaciones con clientes por 25.000, amortizables en 10 años; generan un pasivo por impuesto diferido al 25 %.',
      cashFromBalancePct:
        'Efectivo necesario = pago en efectivo + comisiones de asesoramiento = 63.000 + 1.890 = 64.890. El 40 % (25.956) sale de la caja; el 60 % con deuda nueva al 5 %, cuyo principal cubre también su comisión del 1 %: 38.934 / 0,99 = 39.327.',
      consideration:
        'Por cada acción de Naranjas: 0,25 acciones nuevas de Azahar (5,25 €) + 5,25 € en efectivo. El canje si todo fuera en acciones sería 0,5 (10,50 / 21).',
    },
    results: merger,
    sensitivity: {
      year1AccretionByOfferAndSynergies: {
        rows: offerAxis,
        cols: synAxis,
        values: offerAxis.map((op) =>
          synAxis.map((s) =>
            rd(
              at(
                buildMerger(ACQUIRER, target, {
                  ...MERGER_DEAL,
                  offerPricePerShare: op,
                  runRateSynergies: s,
                }).years,
                0,
              ).accretionDilution,
              6,
            ),
          ),
        ),
      },
      accretionByCashMix: {
        rows: mixAxis,
        cols: targetYears,
        values: mixAxis.map((cp) =>
          buildMerger(ACQUIRER, target, { ...MERGER_DEAL, cashPct: cp }).years.map((y) =>
            rd(y.accretionDilution, 6),
          ),
        ),
      },
    },
    notes: [
      'BPA contable: incluye la amortización de los intangibles de la PPA. Las comisiones de asesoramiento se pagan al cierre y no entran en el BPA recurrente.',
      'Fondo de comercio: en cuentas consolidadas NIIF-UE no se amortiza (test de deterioro anual, NIC 36); en cuentas individuales con el PGC se amortiza en 10 años salvo prueba en contrario. El modelo usa NIIF (cotizada que consolida).',
      'Con P/E de la compradora (14,0x) por debajo del P/E pagado, la parte en acciones diluye; la parte en efectivo acrece si el coste de la deuda después de impuestos es menor que el rendimiento del beneficio de la objetivo.',
    ],
  };

  return roundDeep({
    'naranjas-del-turia-3-estados.json': threeStatement,
    'naranjas-del-turia-dcf.json': dcf,
    'naranjas-del-turia-lbo.json': lboModel,
    'naranjas-del-turia-merger.json': mergerModel,
  });
}

/**
 * Excepción del art. 16.5 LIS: deuda de adquisición ≤ 70 % del precio y reducción proporcional en 8 años hasta
 * el 30 % del precio. Devuelve, año a año, el máximo permitido y la deuda real (con PIK).
 */
export function acquisitionDebtTest(
  sources: { id: string; amount: number }[],
  price: number,
  years: { year: number; deuda_total_final: number }[],
) {
  const debt = sources
    .filter((x) => !['caja_sociedad', 'capital_fondo'].includes(x.id))
    .reduce((acc, x) => acc + x.amount, 0);
  const floor = 0.3 * price;
  const rows = years.map((y, i) => {
    const maxAllowed = debt - ((debt - floor) * (i + 1)) / 8;
    return {
      year: y.year,
      maxAllowed,
      actual: y.deuda_total_final,
      ok: y.deuda_total_final <= maxAllowed,
    };
  });
  return {
    initialDebt: debt,
    price,
    initialPct: debt / price,
    initialOk: debt <= 0.7 * price,
    finalPct: at(years, -1).deuda_total_final / price,
    years: rows,
    allOk: debt <= 0.7 * price && rows.every((r) => r.ok),
  };
}

/** Redondea a 6 decimales los números no enteros para que el JSON sea legible y estable. */
export function roundDeep<T>(v: T): T {
  if (typeof v === 'number') return (Number.isInteger(v) ? v : rd(v, 6)) as T;
  if (Array.isArray(v)) return v.map(roundDeep) as T;
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x)])) as T;
  return v;
}

/** Precio máximo por acción que da exactamente la TIR objetivo (bisección sobre el precio). */
export function maxOfferForIrr(last: StatementYear, a: LboAssumptions, target: number): number {
  let lo = 1;
  let hi = 30;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (buildLbo(last, { ...a, offerPricePerShare: mid }).irr > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
