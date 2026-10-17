import { describe, expect, it } from 'vitest';
import conceptsJson from '../../content/shared/concepts.json';
import { liveStocks, newsTemplates } from '../content/mesa';
import { conceptsSchema } from '../content/schemas';
import { dayKey } from './days';
import { makeEvent } from './events';
import { projectXp } from './projections';
import {
  buildMarket,
  closeXp,
  closesLeftToday,
  closesOf,
  DAYS_PER_REAL_DAY,
  feeFor,
  firstDay,
  isDiversified,
  mesaEvents,
  projectPortfolio,
  quoteOrder,
  scoreboard,
  START_CASH,
  tradingDate,
  valueAt,
  type MesaEvent,
} from './live-market';

const stocks = liveStocks();
const templates = newsTemplates();
const market = buildMarket(stocks, templates, firstDay + 60);
const nar = 'naranjas-del-turia';

describe('mercado determinista', () => {
  it('mismo día, misma vela; alargar el mercado no cambia los días ya generados', () => {
    const again = buildMarket(stocks, templates, firstDay + 60);
    expect(again).toEqual(market);
    const longer = buildMarket(stocks, templates, firstDay + 90);
    expect(longer.slice(0, market.length)).toEqual(market);
  });
  it('velas coherentes: mínimo ≤ apertura/cierre ≤ máximo y precios positivos', () => {
    for (const d of market)
      for (const q of Object.values(d.quotes)) {
        expect(q.low).toBeLessThanOrEqual(Math.min(q.open, q.close) + 1e-9);
        expect(q.high).toBeGreaterThanOrEqual(Math.max(q.open, q.close) - 1e-9);
        expect(q.low).toBeGreaterThan(0);
      }
  });
  it('el movimiento se descompone exactamente en mercado + propio + noticia', () => {
    for (let i = 1; i < market.length; i++)
      for (const s of stocks) {
        const q = market[i]!.quotes[s.id]!;
        const prev = market[i - 1]!.quotes[s.id]!.close;
        const { market: m, own, news } = q.drivers;
        expect(Math.log(q.close / prev)).toBeCloseTo(m + own + news, 9);
      }
  });
  it('la noticia de empresa recae en su empresa y con su signo', () => {
    const withNews = market.filter((d) => d.news?.companyId);
    expect(withNews.length).toBeGreaterThan(10);
    for (const d of withNews) {
      const n = d.news!;
      const tpl = templates.find((t) => t.id === n.templateId)!;
      expect(Math.sign(n.impact)).toBe(tpl.sign);
      expect(d.quotes[n.companyId!]!.drivers.news).toBe(n.impact);
      expect(n.headline).not.toContain('{empresa}');
      for (const s of stocks)
        if (s.id !== n.companyId) expect(d.quotes[s.id]!.drivers.news).toBe(0);
    }
  });
  it('hay noticias macro que mueven a todos', () => {
    expect(market.some((d) => d.news && d.news.companyId === null)).toBe(true);
  });
  it('fechas de lunes a viernes', () => {
    expect(tradingDate(0)).toBe('2026-01-05');
    expect(tradingDate(5)).toBe('2026-01-12');
    for (let i = 0; i < 30; i++) expect([0, 6]).not.toContain(new Date(tradingDate(i)).getUTCDay());
  });
});

describe('órdenes', () => {
  const p0 = projectPortfolio([], market);
  it('empiezas con 10.000 € el primer día', () => {
    expect(p0).toMatchObject({ cash: START_CASH, day: firstDay, closedDays: 0, positions: {} });
  });
  it('comprar cuesta apertura × (1 + media horquilla) + comisión (0,1 %, mínimo 1 €)', () => {
    const open = market[firstDay]!.quotes[nar]!.open;
    const q = quoteOrder(p0, market, nar, 'buy', 10);
    expect(q.ok).toBe(true);
    expect(q.price).toBeCloseTo(Math.round(open * 1.0005 * 100) / 100, 9);
    expect(q.fee).toBe(1); // 10 acciones ≈ 100 €: se aplica el mínimo
    expect(q.total).toBeCloseTo(q.gross + 1, 9);
    expect(feeFor(5000)).toBe(5);
  });
  it('rechaza cantidades no válidas, comprar sin caja y vender sin posición', () => {
    expect(quoteOrder(p0, market, nar, 'buy', 0).reason).toBe('qty');
    expect(quoteOrder(p0, market, nar, 'buy', 1.5).reason).toBe('qty');
    expect(quoteOrder(p0, market, nar, 'buy', 1_000_000).reason).toBe('cash');
    expect(quoteOrder(p0, market, nar, 'sell', 1).reason).toBe('position');
    expect(quoteOrder({ ...p0, day: 99_999 }, market, nar, 'buy', 1).reason).toBe('closed');
  });
});

describe('cartera como proyección de eventos', () => {
  const buy = (stockId: string, qty: number, day = firstDay): MesaEvent => ({
    kind: 'order',
    day,
    stockId,
    side: 'buy',
    qty,
    price: 0,
    fee: 0,
  });
  const close = (day: number, realDay = '2026-10-17'): MesaEvent => ({
    kind: 'close',
    day,
    realDay,
  });

  it('comprar, cerrar el día y vender: caja y posiciones cuadran', () => {
    const evs: MesaEvent[] = [
      buy(nar, 100),
      close(firstDay),
      { kind: 'order', day: firstDay + 1, stockId: nar, side: 'sell', qty: 40, price: 0, fee: 0 },
    ];
    const p = projectPortfolio(evs, market);
    const q1 = quoteOrder(projectPortfolio([], market), market, nar, 'buy', 100);
    const afterBuy = START_CASH - q1.total;
    const p1 = projectPortfolio(evs.slice(0, 2), market);
    const q2 = quoteOrder(p1, market, nar, 'sell', 40);
    expect(p.cash).toBeCloseTo(afterBuy + q2.total, 6);
    expect(p.positions[nar]!.qty).toBe(60);
    expect(p.positions[nar]!.cost).toBeCloseTo((q1.total * 60) / 100, 1);
    expect(p.history).toEqual([{ day: firstDay, value: valueAt(p1, market[firstDay]!, 'close') }]);
    expect(p.day).toBe(firstDay + 1);
  });
  it('vender todo quita la posición', () => {
    const p = projectPortfolio(
      [
        buy(nar, 10),
        { kind: 'order', day: firstDay, stockId: nar, side: 'sell', qty: 10, price: 0, fee: 0 },
      ],
      market,
    );
    expect(p.positions[nar]).toBeUndefined();
    expect(p.cash).toBeLessThan(START_CASH); // dos comisiones y la horquilla
  });
  it('descarta órdenes de otro día o que no caben, y lo cuenta', () => {
    const p = projectPortfolio(
      [buy(nar, 10, firstDay + 3), buy(nar, 10_000_000), close(firstDay + 7)],
      market,
    );
    expect(p.rejected).toBe(3);
    expect(p.cash).toBe(START_CASH);
  });
  it('cerrar más allá del mercado generado se descarta', () => {
    const short = market.slice(0, firstDay + 1);
    const p = projectPortfolio([close(firstDay), close(firstDay + 1)], short);
    expect(p.closedDays).toBe(1);
    expect(p.rejected).toBe(1);
  });
  it('tope de cierres por día real', () => {
    const evs = Array.from({ length: 4 }, (_, i) => close(firstDay + i, '2026-10-17'));
    expect(closesLeftToday(evs, '2026-10-17')).toBe(DAYS_PER_REAL_DAY - 4);
    expect(closesLeftToday([...evs, close(firstDay + 4)], '2026-10-17')).toBe(0);
    expect(closesLeftToday(evs, '2026-10-18')).toBe(DAYS_PER_REAL_DAY);
  });
});

describe('XP por proceso y marcador', () => {
  const d = market[firstDay]!;
  it('diversificar da XP extra; ganar o perder no cuenta', () => {
    const solo = { cash: 0, positions: { [nar]: { qty: 100, cost: 0 } } };
    expect(isDiversified(solo, d)).toBe(false);
    expect(closeXp(solo, d)).toBe(5);
    const three = Object.fromEntries(
      stocks
        .slice(0, 3)
        .map((s) => [s.id, { qty: Math.round(2000 / d.quotes[s.id]!.close), cost: 0 }]),
    );
    const spread = { cash: 4000, positions: three };
    expect(isDiversified(spread, d)).toBe(true);
    expect(closeXp(spread, d)).toBe(10);
    const heavy = { cash: 0, positions: { ...three, [stocks[0]!.id]: { qty: 100_000, cost: 0 } } };
    expect(isDiversified(heavy, d)).toBe(false);
  });
  it('marcador: sin días cerrados todo a 0; después cartera, índice e inflación', () => {
    const p0 = projectPortfolio([], market);
    expect(scoreboard(p0, market)).toMatchObject({
      value: START_CASH,
      portfolioReturn: 0,
      indexReturn: 0,
      inflation: 0,
    });
    const p = projectPortfolio(
      Array.from({ length: 10 }, (_, i): MesaEvent => ({
        kind: 'close',
        day: firstDay + i,
        realDay: 'x',
      })),
      market,
    );
    const s = scoreboard(p, market);
    expect(s.portfolioReturn).toBe(0); // todo en caja
    expect(s.inflation).toBeCloseTo(1.02 ** (10 / 252) - 1, 12);
    expect(s.realReturn).toBeLessThan(0); // la caja pierde contra la inflación
    expect(s.indexReturn).toBeCloseTo(
      market[firstDay + 9]!.index / market[firstDay - 1]!.index - 1,
      12,
    );
  });
  it('closesOf da los últimos cierres', () => {
    expect(closesOf(market, nar, firstDay, 5)).toEqual(
      market.slice(firstDay - 5, firstDay).map((x) => x.quotes[nar]!.close),
    );
  });
});

describe('eventos de la app → La Mesa', () => {
  it('adapta órdenes y cierres en orden de llegada y cuenta el XP del cierre', () => {
    const ctx = { deviceId: 'd1', tz: 'Europe/Madrid' };
    const evs = [
      makeEvent(
        'mesa_day_closed',
        { day: firstDay, xp: 10 },
        { ...ctx, now: new Date('2026-10-17T20:00:00Z') },
      ),
      makeEvent(
        'mesa_order',
        { day: firstDay, stockId: nar, side: 'buy', qty: 5, price: 9, fee: 1 },
        { ...ctx, now: new Date('2026-10-17T19:00:00Z') },
      ),
    ];
    const m = mesaEvents(evs, (iso, tz) => dayKey(iso, tz));
    expect(m.map((e) => e.kind)).toEqual(['order', 'close']);
    expect(m[1]).toEqual({ kind: 'close', day: firstDay, realDay: '2026-10-17' });
    expect(projectXp(evs).total).toBe(10);
  });
  it('todas las noticias citan conceptos que existen', () => {
    const ids = new Set(conceptsSchema.parse(conceptsJson).map((c) => c.id));
    for (const t of templates)
      for (const c of t.concepts) expect(ids.has(c), `${t.id}: ${c}`).toBe(true);
    expect(templates.every((t) => t.impactMin <= t.impactMax)).toBe(true);
  });
});
