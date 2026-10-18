import { describe, expect, it } from 'vitest';
import companies from '../../../content/shared/companies.json';
import {
  BASE_POINTS,
  COMPANIES,
  floatCaps,
  guessIndex,
  guessScore,
  indexResult,
  indexValues,
  playSessions,
  SESSIONS,
  setupIndex,
  startIndex,
  weights,
} from './index-mover';

const play = (seed: number, pick: (actual: number) => number) => {
  const setup = setupIndex(seed);
  const out = playSessions(setup);
  let s = startIndex(setup);
  for (const o of out) s = guessIndex(s, pick(o.pct));
  return s;
};

describe('¿quién mueve el índice?', () => {
  it('las seis empresas cotizadas de companies.json, con sus acciones', () => {
    const list = companies as { id: string; sharesOutstanding?: number; listed?: boolean }[];
    const listed = list.filter((c) => c.listed !== false).map((c) => c.id);
    expect(COMPANIES.map((c) => c.id).sort()).toEqual(listed.sort());
    for (const c of COMPANIES)
      expect(list.find((x) => x.id === c.id)?.sharesOutstanding, c.id).toBe(c.shares);
  });

  it('pesos por capitalización ajustada por free float: suman 100 y la mayor pesa la mitad', () => {
    const prices = COMPANIES.map((c) => c.price);
    const w = weights(prices);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
    expect(floatCaps(prices)[0]).toBeCloseTo(19.6 * 60e6 * 0.45, 2);
    expect(w[0]).toBeGreaterThan(45);
    expect(w[0]).toBeLessThan(55);
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThanOrEqual(w[i - 1]! + 1e-9);
  });

  it('determinista; cuatro sesiones de tipos distintos; la del salto de una pequeña apenas mueve el índice', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = setupIndex(seed);
      expect(setupIndex(seed)).toEqual(s);
      expect(s.sessions).toHaveLength(SESSIONS);
      expect(new Set(s.sessions.map((x) => x.kind)).size).toBe(SESSIONS);
      const out = playSessions(s);
      s.sessions.forEach((x, i) => {
        const big = Math.max(...x.moves.map(Math.abs));
        if (x.kind === 'small-big') {
          expect(big).toBeGreaterThanOrEqual(6);
          expect(Math.abs(out[i]!.pct)).toBeLessThan(1); // el índice no sigue a la pequeña
        }
        if (x.kind === 'big-up') expect(out[i]!.pct).toBeGreaterThan(0);
        if (x.kind === 'second-down') expect(out[i]!.pct).toBeLessThan(0);
        if (x.kind === 'all-up') expect(out[i]!.pct).toBeGreaterThan(0);
      });
    }
  });

  it('la variación del índice es la suma de peso × variación; los pesos de cada día salen del cierre anterior', () => {
    const s = setupIndex(3);
    const out = playSessions(s);
    let level = BASE_POINTS;
    out.forEach((o, i) => {
      const sum = o.weights.reduce((a, w, k) => a + (w * s.sessions[i]!.moves[k]!) / 100, 0);
      expect(o.pct).toBeCloseTo(sum, 12);
      level *= 1 + o.pct / 100;
      expect(o.level).toBeCloseTo(level, 9);
    });
    expect(out[1]!.weights).not.toEqual(out[0]!.weights);
  });

  it('la semilla de la lección (3) termina en subida: la tarjeta dice «una subida del {pct} %»', () => {
    const r = indexResult(play(3, () => 0));
    expect(r.pct).toBeGreaterThan(0);
  });

  it('predicción: 1 punto a ≤ 0,15, medio a ≤ 0,5; se recorta al deslizador; nota y cifras', () => {
    expect(guessScore(0.4, 0.3)).toBe(1);
    expect(guessScore(0.7, 0.3)).toBe(0.5);
    expect(guessScore(1, 0.3)).toBe(0);
    const perfect = indexResult(play(3, (a) => a));
    expect(perfect.score).toBe(1);
    expect(perfect.hits).toBe(SESSIONS);
    expect(indexResult(play(3, () => 9)).score).toBe(0); // recortado a +3 %
    const r = indexResult(play(3, () => 0));
    expect(r.start).toBe(BASE_POINTS);
    expect(r.points).toBeCloseTo(r.end - BASE_POINTS, 2);
    expect(r.pct).toBeCloseTo((r.end / BASE_POINTS - 1) * 100, 2);
    expect(Object.keys(indexValues(r)).sort()).toEqual(
      ['end', 'hits', 'pct', 'points', 'start', 'top'].sort(),
    );
    const done = play(3, (a) => a);
    expect(guessIndex(done, 1)).toBe(done);
    expect(guessIndex(startIndex(setupIndex(3)), Number.NaN).guesses).toEqual([]);
  });
});
