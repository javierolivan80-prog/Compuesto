import { describe, expect, it } from 'vitest';
import companies from '../../../content/shared/companies.json';
import {
  firstSharesResult,
  firstSharesValues,
  guess,
  isHit,
  NEWS_BANK,
  pricePath,
  ROUNDS,
  setupFirstShares,
  SHARES,
  STAKE,
  startFirstShares,
  type Move,
} from './first-shares';

const play = (seed: number, pick: (i: number, right: Move) => Move) => {
  const setup = setupFirstShares(seed);
  let s = startFirstShares(setup);
  setup.rounds.forEach((r, i) => (s = guess(s, pick(i, r.news.move))));
  return s;
};

describe('tus primeras acciones', () => {
  it('las acciones son las de Naranjas del Turia en companies.json', () => {
    const list = companies as { id: string; sharesOutstanding?: number }[];
    expect(list.find((c) => c.id === 'naranjas-del-turia')?.sharesOutstanding).toBe(SHARES);
  });

  it('determinista; cinco noticias distintas: dos suben, dos bajan y una no trae nada nuevo', () => {
    for (const seed of [1, 7, 42, 2026]) {
      const a = setupFirstShares(seed);
      expect(setupFirstShares(seed)).toEqual(a);
      expect(a.rounds).toHaveLength(ROUNDS);
      expect(new Set(a.rounds.map((r) => r.news.id)).size).toBe(ROUNDS);
      const count = (m: Move) => a.rounds.filter((r) => r.news.move === m).length;
      expect([count('up'), count('down'), count('flat')]).toEqual([2, 2, 1]);
      expect(a.start).toBeGreaterThanOrEqual(9);
      expect(a.start).toBeLessThan(10);
      expect([35, 40, 45]).toContain(a.freeFloat);
    }
  });

  it('el precio sigue a la noticia: sube entre 2,5 y 6 %, baja igual, y sin novedad apenas se mueve', () => {
    for (let seed = 0; seed < 50; seed++) {
      const setup = setupFirstShares(seed);
      const path = pricePath(setup);
      setup.rounds.forEach((r, i) => {
        const change = (path[i + 1]! / path[i]! - 1) * 100;
        if (r.news.move === 'up') expect(change).toBeGreaterThan(2.3);
        if (r.news.move === 'down') expect(change).toBeLessThan(-2.3);
        if (r.news.move === 'flat') expect(Math.abs(change)).toBeLessThan(0.55);
        expect(Math.abs(r.pct)).toBeLessThanOrEqual(6);
        expect(Number(path[i + 1]!.toFixed(2))).toBe(path[i + 1]);
      });
    }
  });

  it('acertar todo da nota 1; al azar o todo igual, nota baja', () => {
    expect(firstSharesResult(play(7, (_, right) => right)).score).toBe(1);
    expect(firstSharesResult(play(7, (_, right) => right)).hits).toBe(5);
    const allUp = firstSharesResult(play(7, () => 'up'));
    expect(allUp.hits).toBe(2);
    expect(allUp.score).toBeCloseTo(0.1, 3);
    expect(firstSharesResult(play(7, (_, r) => (r === 'up' ? 'down' : 'up'))).score).toBe(0);
  });

  it('resultado: capitalización = precio × acciones; tus acciones = precio × 100; free float', () => {
    const r = firstSharesResult(play(7, (_, right) => right));
    const path = pricePath(setupFirstShares(7));
    expect(r.start).toBe(path[0]);
    expect(r.end).toBe(path.at(-1));
    expect(r.capStart).toBeCloseTo(r.start * SHARES, 2);
    expect(r.capEnd).toBeCloseTo(r.end * SHARES, 2);
    expect(r.stakeEnd).toBeCloseTo(r.end * STAKE, 2);
    expect(r.pct).toBeCloseTo((r.end / r.start - 1) * 100, 2);
    expect(r.floatCap).toBeCloseTo((r.capEnd * r.freeFloat) / 100, 2);
    const v = firstSharesValues(r);
    expect(v).not.toHaveProperty('score');
    expect(v.cap_end).toBe(r.capEnd);
    expect(v.free_float).toBe(r.freeFloat);
  });

  it('no se puede seguir jugando al terminar; isHit compara con lo que hace la noticia', () => {
    const done = play(1, (_, right) => right);
    expect(done.done).toBe(true);
    expect(guess(done, 'up')).toBe(done);
    const flat = NEWS_BANK.find((n) => n.move === 'flat')!;
    expect(isHit({ news: flat, pct: 0.1 }, 'flat')).toBe(true);
    expect(isHit({ news: flat, pct: 0.1 }, 'up')).toBe(false);
  });
});
