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
  }
}
