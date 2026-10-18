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

/* Juegos que abren una lección (lección-juego): qué cifras devuelven y con qué formato se escriben en el texto. */

export const LESSON_GAMES = ['block-trade', 'first-shares'] as const;
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
  }
}
