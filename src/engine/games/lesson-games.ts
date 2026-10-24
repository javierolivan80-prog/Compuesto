import type { Format } from '../params';
import {
  act,
  blockTradeResult,
  remaining,
  resultValues,
  ROUNDS,
  setupBlockTrade,
  startBlockTrade,
  type BlockTradeState,
} from './block-trade';
import {
  firstSharesResult,
  firstSharesValues,
  guess,
  setupFirstShares,
  startFirstShares,
  type Move,
} from './first-shares';
import {
  balanceResult,
  balanceValues,
  classify,
  post,
  setupBalance,
  SIDE_OF,
  startBalance,
} from './balance-builder';
import { bestPlan, cashValues, planResult, setupCash } from './cash-cycle';
import { detectiveResult, detectiveValues, setupDetective } from './ratio-detective';
import {
  cheapResult,
  cheapValues,
  meanOf,
  medianOf,
  rightVerdict,
  setupCheap,
} from './cheap-or-dear';
import { waccResult, waccValues, bestWeight, setupWacc } from './wacc-mix';
import { bondValues, required, setupBond } from './bond-issue';
import { curveValues, fall10, setupCurve } from './yield-curve';
import { fundValues, rightDiff, setupFunds, SITUATIONS } from './fund-fees';
import { luckValues, mean as meanOf2, setupLuck } from './luck-or-skill';
import { dollars, fxValues, rightCompare, setupFx } from './fx-trip';
import { interest, loan, repoValues, setupRepo } from './repo-night';
import {
  macroValues,
  rightBondMove,
  rightCycle,
  setupMacro,
  unemploymentRate,
  yoy,
} from './macro-day';
import { ecbValues, extraInterest, rightFx, RIGHT_QE, setupEcb, taylor } from './ecb-meeting';
import { carryReturn, currentAccount, forward, fxDeskValues, setupFxDesk } from './fx-desk';
import { cet1Ratio, lcr, nii, setupStress, stressedRatio, stressValues } from './stress-test';
import {
  committeeValues,
  expectedLoss,
  provision,
  rightDecision,
  setupCommittee,
  stageOf,
} from './risk-committee';
import {
  nextRatio,
  phaseOf,
  premiumValues,
  sectorFor,
  setupPremium,
  spreadBp,
} from './risk-premium';
import {
  futurePnl,
  minDividend,
  PRODUCTS,
  setupWindow,
  taxSaving,
  windowValues,
} from './bank-window';
import { BASE, bossGrowth, dcfValues, impliedWacc, setupDcf, START_3 } from './dcf-express';
import { cheapestBroker, dividendResult, dividendValues, setupDividend } from './dividend-day';
import { ipoResult, ipoValues, outcomeAt, PRICES, setupIpo } from './ipo-book';
import { setupTakeover, takeoverResult, takeoverValues } from './takeover-rumor';
import {
  guessIndex,
  indexResult,
  indexValues,
  playSessions,
  setupIndex,
  startIndex,
} from './index-mover';
import {
  auctionResult,
  auctionValues,
  equilibrium,
  limitChoices,
  ordersAt830,
  setupAuction,
} from './opening-auction';

/* Juegos que abren una lección (lección-juego): qué cifras devuelven y con qué formato se escriben en el texto. */

export const LESSON_GAMES = [
  'block-trade',
  'first-shares',
  'opening-auction',
  'index-mover',
  'dividend-day',
  'ipo-book',
  'takeover-rumor',
  'balance-builder',
  'cash-cycle',
  'ratio-detective',
  'cheap-or-dear',
  'wacc-mix',
  'dcf-express',
  'bond-issue',
  'yield-curve',
  'fund-fees',
  'luck-or-skill',
  'fx-trip',
  'repo-night',
  'bank-window',
  'macro-day',
  'ecb-meeting',
  'risk-premium',
  'fx-desk',
  'stress-test',
  'risk-committee',
] as const;
export type LessonGameKind = (typeof LESSON_GAMES)[number];

export const LESSON_GAME_FORMATS: Record<LessonGameKind, Record<string, Format>> = {
  'block-trade': {
    qty: [0, 0],
    avg: [2, 4],
    mid: [2, 2],
    cost: [2, 2],
    impact: [2, 2],
    spread: [2, 2],
  },
  'first-shares': {
    start: [2, 2],
    end: [2, 2],
    shares: [0, 0],
    cap_start: [0, 0],
    cap_end: [0, 0],
    pct: [2, 2],
    free_float: [0, 0],
    float_cap: [0, 0],
    stake: [0, 0],
    stake_start: [2, 2],
    stake_end: [2, 2],
    hits: [0, 0],
  },
  'opening-auction': {
    ref: [2, 2],
    ind: [2, 2],
    auction: [2, 2],
    volume: [0, 0],
    qty: [0, 0],
    filled: [0, 0],
    rest: [0, 0],
    cont: [2, 2],
    cost: [2, 2],
    avg: [2, 4],
    pct: [2, 2],
  },
  'index-mover': {
    start: [0, 0],
    end: [2, 2],
    points: [2, 2],
    pct: [2, 2],
    top: [1, 1],
    hits: [0, 0],
  },
  'dividend-day': {
    n: [0, 0],
    p0: [2, 2],
    fee_buy: [2, 2],
    cost: [2, 2],
    div: [2, 2],
    gross: [2, 2],
    retained: [2, 2],
    net: [2, 2],
    p_before: [2, 2],
    p_ex: [2, 2],
    p_end: [2, 2],
    fee_sell: [2, 2],
    sale: [2, 2],
    gain: [2, 2],
    total: [2, 2],
    dy: [2, 2],
    cap_loss: [2, 2],
  },
  'ipo-book': {
    price: [2, 2],
    new_shares: [0, 0],
    sold_shares: [0, 0],
    offer: [0, 0],
    ops_cash: [0, 0],
    opv_cash: [0, 0],
    demand: [0, 0],
    cov: [2, 2],
    first: [2, 2],
    pop: [2, 2],
    shares_after: [0, 0],
    family: [0, 0],
  },
  'takeover-rumor': {
    p0: [2, 2],
    p_rumor: [2, 2],
    offer: [2, 2],
    p_after: [2, 2],
    p_false: [2, 2],
    shares: [0, 0],
    target_shares: [0, 0],
    premium: [2, 2],
    premium_rumor: [2, 2],
    spread: [2, 2],
    deal_size: [0, 0],
    gain_accept: [2, 2],
    gain_sell: [2, 2],
    false_loss: [2, 2],
  },
  'balance-builder': {
    total_start: [0, 0],
    equity_start: [0, 0],
    loan: [0, 0],
    machine: [0, 0],
    sale: [0, 0],
    cost: [0, 0],
    margin: [0, 0],
    suppliers: [0, 0],
    dividend: [0, 0],
    cash_end: [0, 0],
    debt_end: [0, 0],
    equity_end: [0, 0],
    total_end: [0, 0],
    result: [0, 0],
    classify_hits: [0, 0],
    post_hits: [0, 0],
  },
  'cash-cycle': {
    sales: [0, 0],
    cost: [0, 0],
    dso: [0, 0],
    dio: [0, 0],
    dpo: [0, 0],
    ccc: [0, 0],
    clients: [0, 0],
    stock: [0, 0],
    payables: [0, 0],
    nof: [0, 0],
    available: [0, 0],
    limit: [0, 0],
    rate: [0, 0],
    fee: [2, 2],
    shortfall: [0, 0],
    funding_cost: [0, 0],
    margin: [0, 0],
    best_margin: [0, 0],
    factoring: [0, 0],
  },
  'ratio-detective': {
    year: [0, 0],
    hits: [0, 0],
    reveals: [0, 0],
    nar_sales: [0, 0],
    nar_net: [0, 0],
    nar_assets: [0, 0],
    nar_equity: [0, 0],
    nar_margin: [2, 2],
    nar_turnover: [2, 2],
    nar_leverage: [2, 2],
    nar_roe: [2, 2],
    nar_conversion: [2, 2],
    tra_sales: [0, 0],
    tra_net: [0, 0],
    tra_assets: [0, 0],
    tra_equity: [0, 0],
    tra_margin: [2, 2],
    tra_turnover: [2, 2],
    tra_leverage: [2, 2],
    tra_roe: [2, 2],
  },
  'cheap-or-dear': {
    eps: [2, 2],
    ebitda: [0, 0],
    net_debt: [0, 0],
    shares_m: [0, 0],
    price: [2, 2],
    pe_median: [1, 1],
    pe_mean: [1, 1],
    pe_now: [1, 1],
    ev_median: [1, 1],
    value_pe: [2, 2],
    value_ev: [2, 2],
    gap: [1, 1],
    median_hits: [0, 0],
    verdict_hits: [0, 0],
  },
  'wacc-mix': {
    rf: [2, 2],
    erp: [2, 2],
    size: [0, 0],
    beta_u: [2, 2],
    tax: [0, 0],
    weight: [0, 0],
    de: [2, 2],
    beta_l: [4, 4],
    ke: [4, 4],
    kd: [2, 2],
    kd_after: [3, 3],
    wacc: [2, 2],
    pick: [0, 0],
    wacc_pick: [2, 2],
    best: [0, 0],
    wacc_best: [2, 2],
    ke_best: [2, 2],
    kd_best: [2, 2],
  },
  'dcf-express': {
    price: [2, 2],
    target: [2, 2],
    wacc_model: [2, 2],
    g_model: [0, 1],
    fcff_5: [0, 0],
    pv_fcff: [0, 0],
    tv: [0, 0],
    pv_tv: [0, 0],
    ev: [0, 0],
    net_debt: [0, 0],
    equity: [0, 0],
    value: [2, 2],
    tv_share: [1, 1],
    wacc_implied: [1, 1],
    wacc_pick: [1, 1],
    g_boss: [1, 1],
    g_pick: [1, 1],
    tv_share_boss: [1, 1],
    final_wacc: [1, 1],
    final_g: [1, 1],
    final_margin: [1, 1],
    final_value: [2, 2],
  },
  'bond-issue': {
    tesoro: [1, 1],
    spread: [1, 1],
    yield: [1, 1],
    coupon: [1, 1],
    price_issue: [2, 2],
    raised: [0, 0],
    coupon_cash: [2, 2],
    shock: [1, 1],
    new_yield: [1, 1],
    price_after: [2, 2],
    change: [2, 2],
    tir_buy: [2, 2],
    par_price_after: [2, 2],
  },
  'yield-curve': {
    y1: [1, 1],
    y2: [1, 1],
    y5: [1, 1],
    y10: [1, 1],
    y30: [1, 1],
    up_1: [2, 2],
    up_2: [2, 2],
    up_5: [2, 2],
    up_10: [2, 2],
    up_30: [2, 2],
    dur_1: [2, 2],
    dur_2: [2, 2],
    dur_5: [2, 2],
    dur_10: [2, 2],
    dur_30: [2, 2],
    first_level: [2, 2],
    first_slope: [2, 2],
    first_30: [2, 2],
    second_level: [2, 2],
    second_slope: [2, 2],
    second_2: [2, 2],
    second_30: [2, 2],
    pick: [1, 1],
    fall_10: [1, 1],
    fall_30: [1, 1],
    fall_2: [1, 1],
  },
  'fund-fees': {
    gross: [1, 1],
    ter_dear: [1, 1],
    ter_cheap: [1, 1],
    net_dear: [1, 1],
    net_cheap: [1, 1],
    years: [0, 0],
    initial: [0, 0],
    final_dear: [0, 0],
    final_cheap: [0, 0],
    diff: [0, 0],
    value: [0, 0],
    gain: [0, 0],
    tax_rate: [0, 0],
    tax: [0, 0],
    reinvested: [0, 0],
    end_transfer: [0, 0],
    end_sell: [0, 0],
    end_gap: [0, 0],
    vehicle_hits: [0, 0],
  },
  'luck-or-skill': {
    mean_a: [2, 2],
    mean_b: [2, 2],
    sd_a: [2, 2],
    sd_b: [2, 2],
    min_a: [1, 1],
    min_b: [1, 1],
    max_b: [1, 1],
    normal_tail: [1, 1],
    fat_tail: [1, 1],
    traders: [0, 0],
    calls: [0, 0],
    perfect: [0, 0],
    expected_perfect: [0, 0],
    hits: [0, 0],
  },
  'fx-trip': {
    amount: [0, 0],
    rate0: [2, 2],
    rate1: [2, 2],
    usd: [0, 0],
    etf: [0, 0],
    usd_end: [0, 0],
    eur_end: [0, 0],
    eur_return: [2, 2],
    hedge_cost: [1, 1],
    hedged_end: [0, 0],
    hedged_return: [1, 1],
    hits: [0, 0],
  },
  'repo-night': {
    collateral: [0, 0],
    haircut: [0, 0],
    rate: [1, 1],
    days: [0, 0],
    loan: [2, 2],
    interest: [0, 0],
    repay: [0, 0],
    hits: [0, 0],
  },
  'bank-window': {
    contribution: [0, 0],
    marginal: [0, 0],
    saving: [0, 0],
    rent_profit: [0, 0],
    min_dividend: [0, 0],
    f0: [0, 0],
    f1: [0, 0],
    units: [0, 0],
    pnl: [0, 0],
    complex_hits: [0, 0],
  },
  'macro-day': {
    cpi_prev: [1, 1],
    cpi_now: [1, 1],
    cpi_yoy: [1, 1],
    consensus: [1, 1],
    surprise: [1, 1],
    pmi: [1, 1],
    active: [0, 2],
    unemployed: [0, 2],
    unemployment_rate: [1, 1],
    hits: [0, 0],
  },
  'ecb-meeting': {
    neutral: [0, 1],
    inflation: [0, 1],
    target: [0, 0],
    taylor: [1, 2],
    priced_bp: [0, 0],
    move_bp: [0, 0],
    surprise_bp: [0, 0],
    principal: [0, 0],
    euribor0: [0, 2],
    euribor1: [0, 2],
    extra_interest: [0, 0],
    hits: [0, 0],
  },
  'risk-premium': {
    growth: [1, 1],
    potential: [1, 1],
    infl_prev: [1, 1],
    infl_now: [1, 1],
    pmi: [1, 1],
    spain: [2, 2],
    bund: [2, 2],
    spread_bp: [0, 0],
    debt: [0, 0],
    gdp: [0, 0],
    deficit: [0, 0],
    nominal_growth: [0, 1],
    debt_ratio0: [1, 1],
    debt_ratio1: [1, 1],
    hits: [0, 0],
  },
  'fx-desk': {
    exports: [0, 0],
    imports: [0, 0],
    trade_balance: [0, 0],
    income: [0, 0],
    current_account: [0, 0],
    spot: [2, 4],
    i_eur: [0, 1],
    i_usd: [0, 1],
    forward: [4, 4],
    i_high: [0, 0],
    i_fund: [0, 0],
    depreciation: [1, 1],
    carry: [1, 1],
    hits: [0, 0],
  },
  'stress-test': {
    loans: [0, 0],
    deposits: [0, 0],
    r_loans: [0, 1],
    r_deposits: [0, 1],
    nii: [0, 0],
    mortgages: [0, 0],
    corporates: [0, 0],
    apr: [0, 0],
    cet1: [0, 0],
    k_cet1: [2, 2],
    m_loss: [3, 3],
    k_hqla: [1, 1],
    cet1_ratio: [1, 1],
    losses: [0, 0],
    apr_rise: [0, 0],
    stressed_ratio: [1, 1],
    hqla: [0, 0],
    outflows: [0, 0],
    inflows: [0, 0],
    lcr: [1, 1],
    hits: [0, 0],
  },
  'risk-committee': {
    ead: [0, 0],
    pd: [0, 1],
    lgd: [0, 0],
    el: [0, 2],
    margin: [1, 1],
    margin_income: [0, 2],
    lgd_collateral: [0, 0],
    el_collateral: [0, 2],
    ead2: [0, 0],
    pd12: [0, 1],
    pd_life: [0, 0],
    lgd2: [0, 0],
    days: [0, 0],
    notches: [0, 0],
    stage: [0, 0],
    provision: [0, 2],
    hits: [0, 0],
  },
};

/**
 * Resultados de partidas de referencia (todo de golpe, trocear, esperar a la noticia, quedarse sin tiempo): con
 * ellos content:validate comprueba que los ejercicios de la lección funcionan con cifras de partidas reales.
 */
export function referenceValues(kind: LessonGameKind, seed: number): Record<string, number>[] {
  switch (kind) {
    case 'block-trade': {
      const setup = setupBlockTrade(seed);
      const play = (moves: (s: BlockTradeState) => BlockTradeState) =>
        resultValues(blockTradeResult(moves(startBlockTrade(setup))));
      return [
        play((s) => act(s, { type: 'market', qty: setup.target })),
        play((s) => {
          const a = act(s, { type: 'market', qty: 300 });
          return act(a, { type: 'market', qty: remaining(a) });
        }),
        play((s) => {
          const a = act(act(s, { type: 'wait' }), { type: 'wait' });
          return act(a, { type: 'market', qty: remaining(a) });
        }),
        play((s) => {
          let x = s;
          for (let i = 0; i < ROUNDS; i++) x = act(x, { type: 'wait' });
          return x;
        }),
      ];
    }
    case 'first-shares': {
      // los precios no dependen de lo que predigas: solo cambian los aciertos
      const setup = setupFirstShares(seed);
      const play = (pick: (right: Move) => Move) => {
        let s = startFirstShares(setup);
        for (const r of setup.rounds) s = guess(s, pick(r.news.move));
        return firstSharesValues(firstSharesResult(s));
      };
      return [play((r) => r), play(() => 'up'), play((r) => (r === 'down' ? 'up' : 'down'))];
    }
    case 'opening-auction': {
      // a mercado, la limitada sin tocar desde las 8:30, el límite más bajo y el más alto que se podían elegir
      const setup = setupAuction(seed);
      const choices = limitChoices(setup, 1);
      return [
        { limit: null },
        { limit: equilibrium(ordersAt830(setup), setup.ref).price },
        { limit: choices[0]! },
        { limit: choices.at(-1)! },
      ].map((mine) => auctionValues(auctionResult(setup, mine)));
    }
    case 'index-mover': {
      // los puntos del índice no dependen de lo que predigas: solo cambian los aciertos
      const setup = setupIndex(seed);
      const out = playSessions(setup);
      const play = (pick: (actual: number) => number) => {
        let s = startIndex(setup);
        for (const o of out) s = guessIndex(s, pick(o.pct));
        return indexValues(indexResult(s));
      };
      return [play((a) => a), play(() => 0), play(() => 3)];
    }
    case 'dividend-day': {
      // las cifras solo dependen del bróker: el más barato y cada uno de los tres
      const setup = setupDividend(seed);
      return [cheapestBroker(setup), 0, 1, 2].map((broker) =>
        dividendValues(dividendResult(setup, { broker, capture: false, exGuess: 'down' })),
      );
    }
    case 'ipo-book': {
      // todos los precios con los que la oferta se cubre (si no se cubre, el juego pide otro precio)
      const setup = setupIpo(seed);
      return PRICES.filter((p) => outcomeAt(setup, p) !== 'failed').map((p) =>
        ipoValues(ipoResult(setup, p)),
      );
    }
    case 'takeover-rumor': {
      // las cifras no dependen de lo que decidas
      const setup = setupTakeover(seed);
      return [
        takeoverValues(
          takeoverResult(setup, { buyOnRumor: false, reportInsider: true, final: 'accept' }),
        ),
      ];
    }
    case 'balance-builder': {
      // el balance avanza siempre con el apunte correcto: las cifras no dependen de lo que elijas
      const setup = setupBalance(seed);
      let s = startBalance(setup);
      for (const id of setup.order) s = classify(s, SIDE_OF[id]);
      for (const op of setup.ops) s = post(s, op.right);
      return [balanceValues(balanceResult(s))];
    }
    case 'cash-cycle': {
      // el mejor plan, el plan «de siempre» (60/60/50) con póliza y con factoring, y uno de cobrar y pagar pronto
      const setup = setupCash(seed);
      const base = { dso: 60, dio: 60, dpo: 50 } as const;
      return [
        bestPlan(setup),
        planResult(setup, { ...base, funding: 'poliza' }),
        planResult(setup, { ...base, funding: 'factoring' }),
        planResult(setup, { dso: 30, dio: 45, dpo: 30, funding: 'poliza' }),
      ].map((r) => cashValues(setup, r));
    }
    case 'ratio-detective': {
      // las cifras de las empresas no dependen de lo que adivines: acertarlo todo sin pedir ratios y fallarlo todo
      const setup = setupDetective(seed);
      return [
        detectiveValues(setup, detectiveResult(setup, setup.cards, 0)),
        detectiveValues(setup, detectiveResult(setup, [...setup.cards].reverse(), 5)),
      ];
    }
    case 'cheap-or-dear': {
      // las cifras de Naranjas no dependen de lo que elijas: todo bien, y con la media y el veredicto al revés
      const setup = setupCheap(seed);
      const right = setup.cases.map((c) => ({
        pe: medianOf(c.peers.map((p) => p.pe)),
        verdict: rightVerdict(c),
      }));
      const wrong = setup.cases.map((c) => ({
        pe: meanOf(c.peers.map((p) => p.pe)),
        verdict: rightVerdict(c) === 'cheap' ? ('dear' as const) : ('cheap' as const),
      }));
      return [
        cheapValues(setup, cheapResult(setup, right)),
        cheapValues(setup, cheapResult(setup, wrong)),
      ];
    }
    case 'wacc-mix': {
      // el mínimo con la beta bien, y la estructura de hoy con la beta mal
      const setup = setupWacc(seed);
      return [
        waccValues(setup, waccResult(setup, true, bestWeight(setup))),
        waccValues(setup, waccResult(setup, false, 20)),
      ];
    }
    case 'dcf-express': {
      // todo bien (caso base con el WACC de la rejilla), y nada tocado con la g del jefe defendida
      const setup = setupDcf(seed);
      const wacc = Math.round(BASE.wacc * 10) / 10;
      return [
        dcfValues(setup, {
          wacc: impliedWacc(setup),
          g: bossGrowth(setup),
          defend: false,
          final: { wacc, g: BASE.g, margin: 0 },
        }),
        dcfValues(setup, { wacc, g: BASE.g, defend: true, final: START_3 }),
      ];
    }
    case 'bond-issue': {
      // todo bien (a la par), y el cupón inicial del 3 % con la dirección y la TIR mal
      const setup = setupBond(seed);
      const y = required(setup);
      return [
        bondValues(setup, {
          coupon: y,
          up: setup.shock < 0,
          tir: Math.round((y + setup.shock) * 100) / 100,
        }),
        bondValues(setup, { coupon: 3, up: setup.shock > 0, tir: 3 }),
      ];
    }
    case 'yield-curve': {
      // los tres retos bien, y nada movido con la caída mal
      const setup = setupCurve(seed);
      const zero = { level: 0, slope: 0 };
      return [
        curveValues(setup, {
          first: { level: 1, slope: 0 },
          second: { level: 0, slope: -1 },
          pick: fall10(setup),
        }),
        curveValues(setup, { first: zero, second: zero, pick: 0 }),
      ];
    }
    case 'fund-fees': {
      // todo bien, y todo mal (diferencia ingenua, vehículos al revés y vender)
      const setup = setupFunds(seed);
      return [
        fundValues(setup, {
          diff: rightDiff(setup),
          vehicles: SITUATIONS.map((x) => x.right),
          transfer: true,
        }),
        fundValues(setup, {
          diff: 0,
          vehicles: SITUATIONS.map((x) => (x.right === 'etf' ? 'fund' : 'etf')),
          transfer: false,
        }),
      ];
    }
    case 'luck-or-skill': {
      // todo bien, y todo mal
      const setup = setupLuck(seed);
      const m = Math.round(meanOf2(setup.a) * 100) / 100;
      return [
        luckValues(setup, { mean: m, volatile: 'b', tails: 'more', genius: false }),
        luckValues(setup, { mean: 0, volatile: 'a', tails: 'normal', genius: true }),
      ];
    }
    case 'fx-trip': {
      // todo bien, y todo mal
      const setup = setupFx(seed);
      const right = rightCompare(setup);
      return [
        fxValues(setup, { dollars: Math.round(dollars(setup)), compare: right, hedge: true }),
        fxValues(setup, { dollars: 0, compare: right === 'less' ? 'more' : 'less', hedge: false }),
      ];
    }
    case 'repo-night': {
      // todo bien, y todo mal
      const setup = setupRepo(seed);
      return [
        repoValues(setup, { loan: loan(setup), interest: interest(setup), recourse: 'cedula' }),
        repoValues(setup, { loan: 0, interest: 0, recourse: 'titulizacion' }),
      ];
    }
    case 'bank-window': {
      // todo bien, y todo mal
      const setup = setupWindow(seed);
      return [
        windowValues(setup, {
          complex: PRODUCTS.map((p) => p.complex),
          saving: taxSaving(setup),
          dividend: minDividend(setup),
          pnl: futurePnl(setup),
        }),
        windowValues(setup, {
          complex: PRODUCTS.map((p) => !p.complex),
          saving: 0,
          dividend: 0,
          pnl: 0,
        }),
      ];
    }
    case 'macro-day': {
      // todo bien, y todo mal
      const setup = setupMacro(seed);
      return [
        macroValues(setup, {
          yoy: yoy(setup),
          bond: rightBondMove(setup),
          cycle: rightCycle(setup),
          rate: unemploymentRate(setup),
        }),
        macroValues(setup, { yoy: 0, bond: 'flat', cycle: 'expansion', rate: 0 }),
      ];
    }
    case 'ecb-meeting': {
      // todo bien, y todo mal
      const setup = setupEcb(seed);
      return [
        ecbValues(setup, {
          taylor: taylor(setup),
          fx: rightFx(setup),
          extra: extraInterest(setup),
          qe: RIGHT_QE,
        }),
        ecbValues(setup, {
          taylor: 0,
          fx: rightFx(setup) === 'up' ? 'down' : 'up',
          extra: 0,
          qe: 'none',
        }),
      ];
    }
    case 'risk-premium': {
      // todo bien, y todo mal
      const setup = setupPremium(seed);
      const phase = phaseOf(setup);
      const sector = sectorFor(phase);
      return [
        premiumValues(setup, { phase, sector, spread: spreadBp(setup), ratio: nextRatio(setup) }),
        premiumValues(setup, {
          phase: phase === 'boom' ? 'recession' : 'boom',
          sector: sector === 'cyclical' ? 'defensive' : 'cyclical',
          spread: 0,
          ratio: 0,
        }),
      ];
    }
    case 'fx-desk': {
      // todo bien, y todo mal
      const setup = setupFxDesk(seed);
      return [
        fxDeskValues(setup, {
          account: currentAccount(setup),
          forward: forward(setup),
          carry: carryReturn(setup),
          country: setup.vulnerable,
        }),
        fxDeskValues(setup, { account: 0, forward: 0, carry: 0, country: 'same' }),
      ];
    }
    case 'stress-test': {
      // todo bien, y todo mal
      const setup = setupStress(seed);
      return [
        stressValues(setup, {
          nii: nii(setup),
          cet1: cet1Ratio(setup),
          stressed: stressedRatio(setup),
          lcr: lcr(setup),
        }),
        stressValues(setup, { nii: 0, cet1: 0, stressed: 0, lcr: 0 }),
      ];
    }
    case 'risk-committee': {
      // todo bien, y todo mal
      const setup = setupCommittee(seed);
      return [
        committeeValues(setup, {
          el: expectedLoss(setup),
          decision: rightDecision(setup),
          stage: stageOf(setup),
          provision: provision(setup),
        }),
        committeeValues(setup, {
          el: 0,
          decision: rightDecision(setup) === 'approve' ? 'reject' : 'approve',
          stage: stageOf(setup) === 1 ? 3 : 1,
          provision: 0,
        }),
      ];
    }
  }
}
