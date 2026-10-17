import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../prng';
import { gamesData } from '../../content/games-data';
import { RATINGS, ratingAtLeast, type Rating } from '../game-kit';
import { compoundRounds } from './compound';
import { BELL_CARDS, bellSequence, fallMs, playBell, type BellCard } from './bell';
import {
  BUDGET_CATEGORIES,
  BUDGET_ITEMS_PER_ROUND,
  BUDGET_ROUNDS,
  balanceOf,
  budgetRound,
  playBudget,
  type BudgetCategory,
} from './budget';
import { dailySeed, hashSeed, tallyScore, emptyTally, addTally } from './common';
import {
  candleFor,
  availableHeadlines,
  judgeRound,
  newsRounds,
  playNews,
  type NewsAnswer,
} from './news';
import {
  ORDER_REQUESTS,
  ORDER_TYPES,
  orderRequests,
  playOrders,
  resolveOrder,
  type OrderChoice,
} from './orders';

/** Reparto de notas de una estrategia repetida en muchas semillas. */
function distribution(play: (seed: number) => Rating, n = 1000): Record<Rating, number> {
  const c = Object.fromEntries(RATINGS.map((r) => [r, 0])) as Record<Rating, number>;
  for (let s = 1; s <= n; s++) c[play(s)]++;
  return c;
}
/** JUEGOS §5: jugando al azar casi siempre sale B y prácticamente nunca pasa de BB; AAA/AA, jamás. */
function expectRandomIsB(c: Record<Rating, number>, n = 1000) {
  expect(c.B / n).toBeGreaterThanOrEqual(0.95);
  const above = RATINGS.filter((r) => ratingAtLeast(r, 'BBB')).reduce((a, r) => a + c[r], 0);
  expect(above / n).toBeLessThanOrEqual(0.01);
  expect(c.AAA + c.AA).toBe(0);
}

describe('determinismo entre dispositivos (valores de referencia fijados)', () => {
  // Si estos valores cambian, las partidas del día dejan de ser comparables entre dispositivos y versiones.
  it('presupuesto', () => {
    expect(budgetRound(1, 0).map((i) => `${i.id}:${i.amount}`)).toEqual([
      'viaje:25',
      'luz:55',
      'alquiler:350',
      'regalo:60',
      'beca:370',
    ]);
  });
  it('compuesto', () => {
    expect(compoundRounds(1).map((r) => r.target)).toEqual([237000, 71000, 64000, 95000]);
  });
  it('órdenes', () => {
    expect(orderRequests(1, 3).map((r) => `${r.intent}:${r.qty}:${r.bids[0]!.price}`)).toEqual([
      'cap:400:27.3',
      'cap:150:11.75',
      'cap:350:11',
    ]);
  });
  it('titulares', () => {
    const all = availableHeadlines(new Set(gamesData.titulares.flatMap((h) => h.concepts)));
    expect(
      newsRounds(1, all)
        .slice(0, 3)
        .map((r) => `${r.headline.id}:${r.motiveOrder.join('')}`),
    ).toEqual(['contrato-largo:021', 'venta-fondo:012', 'cierre-planta:201']);
  });
});

describe('comunes', () => {
  it('la semilla del día es estable por juego y día, y distinta entre juegos y días', () => {
    expect(dailySeed('campana', '2026-10-17')).toBe(dailySeed('campana', '2026-10-17'));
    expect(dailySeed('campana', '2026-10-17')).not.toBe(dailySeed('campana', '2026-10-18'));
    expect(dailySeed('campana', '2026-10-17')).not.toBe(dailySeed('presupuesto', '2026-10-17'));
    expect(hashSeed('a')).toBe(hashSeed('a'));
  });
  it('tallyScore: 0 al azar, 1 perfecto, acotado y seguro con vacío', () => {
    let t = emptyTally();
    for (let i = 0; i < 10; i++) t = addTally(t, 0.5, 0.5);
    expect(tallyScore(t)).toBe(0);
    t = emptyTally();
    for (let i = 0; i < 10; i++) t = addTally(t, 1, 0.5);
    expect(tallyScore(t)).toBe(1);
    expect(tallyScore(emptyTally())).toBe(0);
  });
});

const deck: BellCard[] = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i}`,
  text: `afirmación ${i}`,
  answer: i % 3 !== 0,
  concepts: [`k${i % 4}`],
}));

describe('Campana de apertura', () => {
  it('la secuencia es determinista, de 24, sin repetir seguidas y exige un mazo mínimo', () => {
    const a = bellSequence(deck, 5);
    expect(a).toHaveLength(BELL_CARDS);
    expect(bellSequence(deck, 5)).toEqual(a);
    expect(bellSequence(deck, 6)).not.toEqual(a);
    for (let i = 1; i < a.length; i++) expect(a[i]!.id).not.toBe(a[i - 1]!.id);
    expect(() => bellSequence(deck.slice(0, 3), 1)).toThrow();
  });
  it('cae más rápido con la racha, con suelo en 3,5 s', () => {
    expect(fallMs(0)).toBe(7000);
    expect(fallMs(4)).toBeLessThan(fallMs(0));
    expect(fallMs(100)).toBe(3500);
  });
  it('todo bien = AAA; tarjetas sin contestar cuentan como fallo y enlazan conceptos', () => {
    const cards = bellSequence(deck, 2);
    expect(
      playBell(
        2,
        cards,
        cards.map((c) => c.answer),
      ).rating,
    ).toBe('AAA');
    const r = playBell(
      2,
      cards,
      cards.map(() => null),
    );
    expect(r.rating).toBe('B');
    expect(r.missedConcepts.length).toBeGreaterThan(0);
  });
  it('al azar sale B', () => {
    expectRandomIsB(
      distribution((s) => {
        const rnd = mulberry32(s + 99);
        const cards = bellSequence(deck, s);
        return playBell(
          s,
          cards,
          cards.map(() => rnd() < 0.5),
        ).rating;
      }),
    );
  });
});

describe('Cuadra tu presupuesto', () => {
  it('cada ronda cuadra (ingresos = gastos + ahorro) y tiene el tamaño previsto, en 300 semillas', () => {
    for (let s = 1; s <= 300; s++)
      for (let r = 0; r < BUDGET_ROUNDS; r++) {
        const items = budgetRound(s, r);
        const placed = items.map((i) => i.category);
        expect(balanceOf(items, placed).diff).toBe(0);
        expect(items.length).toBeGreaterThanOrEqual(BUDGET_ITEMS_PER_ROUND[r]!);
        expect(items.length).toBeLessThanOrEqual(BUDGET_ITEMS_PER_ROUND[r]! + 1);
        expect(items.every((i) => i.amount > 0 && Number.isInteger(i.amount))).toBe(true);
        expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      }
  });
  it('es determinista por semilla', () => {
    expect(budgetRound(4, 1)).toEqual(budgetRound(4, 1));
    expect(budgetRound(4, 1)).not.toEqual(budgetRound(5, 1));
  });
  it('colocar mal una partida descuadra la balanza', () => {
    const items = budgetRound(3, 0);
    const placed: (BudgetCategory | null)[] = items.map((i) => i.category);
    const k = items.findIndex((i) => i.category === 'gasto');
    placed[k] = 'ahorro'; // gasto → ahorro: sigue cuadrando; gasto → ingreso: no
    expect(balanceOf(items, placed).diff).toBe(0);
    placed[k] = 'ingreso';
    expect(balanceOf(items, placed).diff).toBe(2 * items[k]!.amount);
    placed[k] = null;
    expect(balanceOf(items, placed).diff).toBe(items[k]!.amount);
  });
  it('perfecto = AAA; al azar = B', () => {
    const perfect = Array.from({ length: BUDGET_ROUNDS }, (_, r) =>
      budgetRound(8, r).map((i) => i.category),
    );
    expect(playBudget(8, perfect).rating).toBe('AAA');
    expectRandomIsB(
      distribution((s) => {
        const rnd = mulberry32(s + 7);
        const rounds = Array.from({ length: BUDGET_ROUNDS }, (_, r) =>
          budgetRound(s, r).map(() => BUDGET_CATEGORIES[Math.floor(rnd() * 3)]!),
        );
        return playBudget(s, rounds).rating;
      }),
    );
  });
});

describe('Mesa de órdenes', () => {
  it('genera 12 peticiones deterministas con libro coherente', () => {
    const a = orderRequests(3);
    expect(a).toHaveLength(ORDER_REQUESTS);
    expect(orderRequests(3)).toEqual(a);
    for (let s = 1; s <= 200; s++)
      for (const r of orderRequests(s)) {
        expect(r.bids[0]!.price).toBeLessThan(r.asks[0]!.price);
        for (let i = 1; i < 5; i++) {
          expect(r.bids[i]!.price).toBeLessThan(r.bids[i - 1]!.price);
          expect(r.asks[i]!.price).toBeGreaterThan(r.asks[i - 1]!.price);
        }
        if (r.intent === 'cap') {
          expect(r.limitOptions).toHaveLength(3);
          expect(r.limitOptions.filter((p) => p === r.cap)).toHaveLength(1);
          expect(new Set(r.limitOptions).size).toBe(3);
          // el precio del cliente espera dentro del libro: nunca cruza
          if (r.side === 'buy') expect(r.cap!).toBeLessThan(r.asks[0]!.price);
          else expect(r.cap!).toBeGreaterThan(r.bids[0]!.price);
        } else expect(r.cap).toBeNull();
        expect(r.text).not.toMatch(/\{/);
      }
  });
  it('sin «subastas» vistas no salen peticiones de subasta', () => {
    for (let s = 1; s <= 50; s++)
      expect(orderRequests(s, 9, false).some((r) => r.intent === 'auction')).toBe(false);
  });
  it('resolveOrder: cada tipo de orden hace lo que enseña el temario', () => {
    const reqs = orderRequests(11, 60);
    const imm = reqs.find((r) => r.intent === 'immediate')!;
    expect(resolveOrder(imm, { type: 'market' })).toMatchObject({
      raw: 1,
      satisfied: true,
      executed: true,
    });
    expect(
      resolveOrder(imm, {
        type: 'limit',
        limitPrice: imm.side === 'buy' ? imm.bids[0]!.price : imm.asks[0]!.price,
      }),
    ).toMatchObject({
      raw: 0,
      satisfied: false,
      executed: false,
    });
    const cap = reqs.find((r) => r.intent === 'cap')!;
    const ok = resolveOrder(cap, { type: 'limit', limitPrice: cap.cap! });
    expect(ok).toMatchObject({ raw: 1, satisfied: true, executed: false });
    const wrongPrice = cap.limitOptions.find((p) => p !== cap.cap)!;
    expect(resolveOrder(cap, { type: 'limit', limitPrice: wrongPrice }).raw).toBeCloseTo(0.6, 9);
    const market = resolveOrder(cap, { type: 'market' });
    expect(market.raw).toBe(0);
    expect(market.message).toMatch(/no garantiza el precio/);
    const auc = reqs.find((r) => r.intent === 'auction')!;
    expect(resolveOrder(auc, { type: 'auction' })).toMatchObject({ raw: 1, satisfied: true });
    expect(resolveOrder(auc, { type: 'market' }).satisfied).toBe(false);
  });
  it('una limitada que cruza el libro se ejecuta; la que espera, no', () => {
    const cap = orderRequests(13, 60).find((r) => r.intent === 'cap' && r.side === 'buy')!;
    expect(resolveOrder(cap, { type: 'limit', limitPrice: cap.asks[0]!.price }).executed).toBe(
      true,
    );
    expect(resolveOrder(cap, { type: 'limit', limitPrice: cap.cap! }).executed).toBe(false);
  });
  it('perfecto = AAA; al azar = B', () => {
    const perfect = orderRequests(6).map((r): OrderChoice => {
      if (r.intent === 'immediate') return { type: 'market' };
      if (r.intent === 'auction') return { type: 'auction' };
      return { type: 'limit', limitPrice: r.cap! };
    });
    expect(playOrders(6, true, perfect).rating).toBe('AAA');
    expectRandomIsB(
      distribution((s) => {
        const rnd = mulberry32(s + 5);
        const choices = orderRequests(s).map((r): OrderChoice => {
          const type = ORDER_TYPES[Math.floor(rnd() * 3)]!;
          return type === 'limit'
            ? { type, limitPrice: r.limitOptions[Math.floor(rnd() * 3)] ?? r.asks[0]!.price }
            : { type };
        });
        return playOrders(s, true, choices).rating;
      }),
    );
  });
});

const seenAll = new Set(gamesData.titulares.flatMap((h) => h.concepts));
const pool = availableHeadlines(seenAll);

describe('¿Sube o baja?', () => {
  it('solo salen titulares con todos sus conceptos vistos', () => {
    expect(
      availableHeadlines(new Set(['formacion-precios'])).every((h) => h.concepts.length === 1),
    ).toBe(true);
    expect(availableHeadlines(new Set())).toHaveLength(0);
    expect(pool).toHaveLength(gamesData.titulares.length);
  });
  it('la vela sigue la dirección del titular (500 semillas) y es plausible', () => {
    for (const h of pool)
      for (let s = 1; s <= 100; s++) {
        const c = candleFor(h, s);
        expect(c.close > c.open).toBe(h.direction === 'up');
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
        expect(Math.abs(c.close / c.open - 1)).toBeGreaterThan(0.02);
      }
  });
  it('las rondas son deterministas, sin repetir titular, y el orden de motivos es una permutación', () => {
    const a = newsRounds(5, pool);
    expect(newsRounds(5, pool)).toEqual(a);
    expect(new Set(a.map((r) => r.headline.id)).size).toBe(a.length);
    for (const r of a) expect([...r.motiveOrder].sort()).toEqual([0, 1, 2]);
    expect(() => newsRounds(1, pool.slice(0, 3))).toThrow();
  });
  it('acierto doble = dirección + motivo', () => {
    const r = newsRounds(7, pool)[0]!;
    const pos = r.motiveOrder.indexOf(r.headline.answer);
    expect(judgeRound(r, { direction: r.headline.direction, motive: pos }).double).toBe(true);
    expect(judgeRound(r, { direction: r.headline.direction, motive: (pos + 1) % 3 }).double).toBe(
      false,
    );
    expect(judgeRound(r, { direction: null, motive: null })).toEqual({
      directionOk: false,
      motiveOk: false,
      double: false,
    });
  });
  it('perfecto = AAA; al azar = B', () => {
    const perfect = newsRounds(9, pool).map((r): NewsAnswer => ({
      direction: r.headline.direction,
      motive: r.motiveOrder.indexOf(r.headline.answer),
    }));
    expect(playNews(9, pool, perfect).rating).toBe('AAA');
    expectRandomIsB(
      distribution((s) => {
        const rnd = mulberry32(s + 3);
        const answers = newsRounds(s, pool).map((): NewsAnswer => ({
          direction: rnd() < 0.5 ? 'up' : 'down',
          motive: Math.floor(rnd() * 3),
        }));
        return playNews(s, pool, answers).rating;
      }),
    );
  });
});
