import { addDays, dayKey } from './days';
import type { AppEvent } from './events';
import { mulberry32 } from './prng';
import { normalizeEvents } from './projections';
import type { Candle } from './candles';

/* Tu acción personal (CLAUDE.md §7.2): el perfil cotiza con ticker propio y velas diarias.
   Precio inicial 100; día con actividad: precio × (1 + 0,002 × min(XP_día, 100) / 10 × f), con f = factor de precisión
   entre 0,5 y 1,5; día sin actividad: −1 %, con suelo en el 50 % del máximo histórico. Pura y determinista. */

export const STOCK_START = 100;
export const STOCK_BASE = 0.002;
export const STOCK_XP_CAP = 100;
export const STOCK_DECAY = 0.01;
export const STOCK_FLOOR_RATIO = 0.5;

export interface StockDay {
  day: string;
  xp: number;
  /** Precisión del día (0–1); null si no hubo ejercicios corregidos. */
  accuracy: number | null;
}

/** Factor de precisión f: 0,5 con 0 % de acierto, 1,5 con 100 %; sin ejercicios, neutro (1,0). */
export const precisionFactor = (accuracy: number | null): number =>
  accuracy === null ? 1 : 0.5 + Math.min(1, Math.max(0, accuracy));

export interface StockCandle extends Candle {
  /** XP de ese día (0 = día de corrección). */
  xp: number;
}

export interface Stock {
  ticker: string;
  candles: StockCandle[];
  price: number;
  /** Variación del último día en %. */
  dayChangePct: number;
  /** Variación desde el inicio en %. */
  totalChangePct: number;
  /** Máximo histórico de cierre. */
  max: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const hash = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/**
 * Serie de velas desde el primer día activo hasta `today`. Los días intermedios sin actividad corrigen −1 %.
 * Hoy solo cuenta como corrección si ya ha terminado; mientras tanto la vela de hoy queda abierta (sin cambio)
 * hasta que haya actividad: perder la racha es una corrección, no un castigo por no haber jugado todavía.
 */
export function stockFromDays(days: readonly StockDay[], today: string, initials = 'YO'): Stock {
  const ticker = `$${initials.toUpperCase()}`;
  const byDay = new Map(days.filter((d) => d.xp > 0).map((d) => [d.day, d]));
  const first = [...byDay.keys()].sort()[0];
  if (!first || first > today) {
    return {
      ticker,
      candles: [],
      price: STOCK_START,
      dayChangePct: 0,
      totalChangePct: 0,
      max: STOCK_START,
    };
  }
  const candles: StockCandle[] = [];
  let price = STOCK_START;
  let max = STOCK_START;
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const act = byDay.get(d);
    const open = price;
    let close: number;
    if (act) {
      const gain =
        STOCK_BASE * (Math.min(act.xp, STOCK_XP_CAP) / 10) * precisionFactor(act.accuracy);
      close = open * (1 + gain);
    } else if (d === today) {
      close = open; // hoy aún no ha terminado
    } else {
      close = Math.max(open * (1 - STOCK_DECAY), max * STOCK_FLOOR_RATIO);
      if (close > open) close = open; // el suelo nunca sube el precio
    }
    close = round2(close);
    // mechas deterministas por día (no cambian al recalcular)
    const rnd = mulberry32(hash(`accion:${d}`));
    const body = Math.abs(close - open);
    const wick = Math.max(open * 0.002, body * 0.3);
    candles.push({
      time: d,
      open: round2(open),
      close,
      high: round2(Math.max(open, close) + wick * rnd()),
      low: round2(Math.min(open, close) - wick * rnd()),
      xp: act?.xp ?? 0,
    });
    price = close;
    max = Math.max(max, close);
  }
  const last = candles.at(-1)!;
  const prev = candles.at(-2)?.close ?? STOCK_START;
  return {
    ticker,
    candles,
    price: last.close,
    dayChangePct: round2(((last.close - prev) / prev) * 100),
    totalChangePct: round2(((last.close - STOCK_START) / STOCK_START) * 100),
    max,
  };
}

/** Proyección desde los eventos: XP por día y precisión por día (ejercicios corregidos), en la zona de cada evento. */
export function stockFromEvents(
  events: readonly AppEvent[],
  today: string,
  initials?: string,
): Stock {
  const xp = new Map<string, number>();
  const answered = new Map<string, { ok: number; n: number }>();
  for (const e of normalizeEvents(events)) {
    const d = dayKey(e.createdAt, e.tz);
    if (
      e.type === 'exercise_answered' ||
      e.type === 'lesson_completed' ||
      e.type === 'game_played'
    ) {
      xp.set(d, (xp.get(d) ?? 0) + e.payload.xp);
    }
    if (e.type === 'exercise_answered') {
      const a = answered.get(d) ?? { ok: 0, n: 0 };
      a.n++;
      if (e.payload.correct) a.ok++;
      answered.set(d, a);
    }
  }
  const days: StockDay[] = [...xp.entries()].map(([day, x]) => {
    const a = answered.get(day);
    return { day, xp: x, accuracy: a && a.n > 0 ? a.ok / a.n : null };
  });
  return stockFromDays(days, today, initials);
}
