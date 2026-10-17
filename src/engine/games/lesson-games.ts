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

/* Juegos que abren una lección (lección-juego): qué cifras devuelven y con qué formato se escriben en el texto. */

export const LESSON_GAMES = ['block-trade'] as const;
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
  }
}
