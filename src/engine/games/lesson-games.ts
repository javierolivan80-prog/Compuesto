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
    ke: [2, 2],
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
  }
}
