import { describe, expect, it } from 'vitest';
import { makeEvent, type AppEvent } from './events';
import {
  STOCK_START,
  precisionFactor,
  stockFromDays,
  stockFromEvents,
  type StockDay,
} from './stock';

const d = (day: string, xp: number, accuracy: number | null = null): StockDay => ({
  day,
  xp,
  accuracy,
});

describe('factor de precisión', () => {
  it('va de 0,5 a 1,5 y es neutro sin ejercicios', () => {
    expect(precisionFactor(0)).toBe(0.5);
    expect(precisionFactor(1)).toBe(1.5);
    expect(precisionFactor(0.5)).toBe(1);
    expect(precisionFactor(null)).toBe(1);
    expect(precisionFactor(-3)).toBe(0.5);
    expect(precisionFactor(9)).toBe(1.5);
  });
});

describe('tu acción', () => {
  it('sin actividad cotiza a 100 sin velas', () => {
    const s = stockFromDays([], '2026-10-17', 'jav');
    expect(s.ticker).toBe('$JAV');
    expect(s.candles).toEqual([]);
    expect(s.price).toBe(STOCK_START);
  });
  it('un día con 100 XP y precisión perfecta sube 0,002 × 10 × 1,5 = 3 %', () => {
    const s = stockFromDays([d('2026-10-15', 100, 1)], '2026-10-15');
    expect(s.candles).toHaveLength(1);
    expect(s.price).toBeCloseTo(103, 2);
    expect(s.totalChangePct).toBeCloseTo(3, 2);
  });
  it('el XP del día se limita a 100: 500 XP suben lo mismo que 100', () => {
    const a = stockFromDays([d('2026-10-15', 100, 0.8)], '2026-10-15').price;
    const b = stockFromDays([d('2026-10-15', 500, 0.8)], '2026-10-15').price;
    expect(b).toBe(a);
  });
  it('la precisión mueve la subida: 100 % rinde 3 veces más que 0 %', () => {
    const lo = stockFromDays([d('2026-10-15', 50, 0)], '2026-10-15').totalChangePct;
    const hi = stockFromDays([d('2026-10-15', 50, 1)], '2026-10-15').totalChangePct;
    expect(hi / lo).toBeCloseTo(3, 1);
  });
  it('los días sin actividad corrigen −1 % y se encadenan', () => {
    const s = stockFromDays([d('2026-10-10', 100, 1)], '2026-10-14');
    expect(s.candles.map((c) => c.time)).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
    expect(s.candles[1]!.close).toBeCloseTo(103 * 0.99, 2);
    expect(s.candles[2]!.close).toBeCloseTo(103 * 0.99 * 0.99, 2);
    // hoy (14) aún no ha terminado: vela plana
    expect(s.candles[4]!.close).toBe(s.candles[4]!.open);
    expect(s.candles[4]!.xp).toBe(0);
  });
  it('el suelo es el 50 % del máximo histórico: nunca baja de ahí', () => {
    const s = stockFromDays([d('2026-01-01', 100, 1)], '2026-12-31');
    expect(s.price).toBeGreaterThanOrEqual(s.max * 0.5 - 0.01);
    expect(s.price).toBeCloseTo(s.max * 0.5, 1);
    const closes = s.candles.map((c) => c.close);
    for (let i = 1; i < closes.length; i++)
      expect(closes[i]!).toBeLessThanOrEqual(closes[i - 1]! + 1e-9);
  });
  it('velas coherentes: máximo ≥ apertura y cierre, mínimo ≤ ambos, cada apertura = cierre anterior', () => {
    const s = stockFromDays(
      [d('2026-10-01', 80, 0.9), d('2026-10-02', 30, 0.5), d('2026-10-05', 100, 1)],
      '2026-10-06',
    );
    s.candles.forEach((c, i) => {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      if (i > 0) expect(c.open).toBeCloseTo(s.candles[i - 1]!.close, 2);
    });
  });
  it('es determinista (mechas incluidas) y no depende del orden de los días', () => {
    const days = [d('2026-10-05', 100, 1), d('2026-10-01', 80, 0.9), d('2026-10-02', 30, 0.5)];
    const a = stockFromDays(days, '2026-10-07');
    expect(stockFromDays([...days].reverse(), '2026-10-07')).toEqual(a);
    expect(stockFromDays(days, '2026-10-07')).toEqual(a);
  });
  it('días de 0 XP no cuentan como actividad', () => {
    const s = stockFromDays([d('2026-10-10', 0)], '2026-10-12');
    expect(s.candles).toEqual([]);
  });
  it('una racha larga sube más que días sueltos', () => {
    const racha = stockFromDays(
      Array.from({ length: 10 }, (_, i) => d(`2026-10-${String(i + 1).padStart(2, '0')}`, 60, 0.9)),
      '2026-10-10',
    );
    const sueltos = stockFromDays(
      [1, 3, 5, 7, 9].map((i) => d(`2026-10-${String(i).padStart(2, '0')}`, 60, 0.9)),
      '2026-10-10',
    );
    expect(racha.price).toBeGreaterThan(sueltos.price);
  });
});

describe('desde los eventos', () => {
  const ev = (
    type: 'exercise_answered' | 'lesson_completed',
    payload: object,
    at: string,
  ): AppEvent => makeEvent(type, payload as never, { deviceId: 't', now: new Date(at) });
  it('suma XP por día y calcula la precisión de ese día', () => {
    const events = [
      ev(
        'exercise_answered',
        { exerciseId: 'e1', lessonId: 'l', conceptIds: [], correct: true, timeMs: 1, xp: 10 },
        '2026-10-15T10:00:00Z',
      ),
      ev(
        'exercise_answered',
        { exerciseId: 'e2', lessonId: 'l', conceptIds: [], correct: false, timeMs: 1, xp: 0 },
        '2026-10-15T10:01:00Z',
      ),
      ev('lesson_completed', { lessonId: 'l', xp: 20, accuracy: 0.5 }, '2026-10-15T10:02:00Z'),
    ];
    const s = stockFromEvents(events, '2026-10-15', 'jav');
    // 30 XP, precisión 0,5 → f = 1 → +0,002 × 3 = 0,6 %
    expect(s.candles).toHaveLength(1);
    expect(s.price).toBeCloseTo(100.6, 2);
    expect(stockFromEvents([...events].reverse(), '2026-10-15', 'jav')).toEqual(s);
  });
  it('un evento duplicado no cuenta dos veces (idempotente)', () => {
    const e = ev(
      'lesson_completed',
      { lessonId: 'l', xp: 50, accuracy: 1 },
      '2026-10-15T10:00:00Z',
    );
    expect(stockFromEvents([e, e], '2026-10-15').price).toBe(
      stockFromEvents([e], '2026-10-15').price,
    );
  });
  it('sin eventos: 100 y sin velas', () => {
    expect(stockFromEvents([], '2026-10-15').price).toBe(100);
  });
});
