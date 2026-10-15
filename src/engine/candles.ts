import { mulberry32 } from './prng';

export interface Candle {
  /** Fecha ISO yyyy-mm-dd (día natural). */
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Velas diarias ficticias y deterministas a partir de una semilla (datos de ejemplo, no de mercado). */
export function seededCandles(
  seed: number,
  days: number,
  start = 100,
  startDate = '2026-01-05',
): Candle[] {
  const rnd = mulberry32(seed);
  const out: Candle[] = [];
  const d = new Date(`${startDate}T00:00:00Z`);
  let prev = start;
  for (let i = 0; i < days; i++) {
    const drift = 0.0015;
    const change = drift + (rnd() - 0.5) * 0.04;
    const open = prev;
    const close = Math.max(1, open * (1 + change));
    const high = Math.max(open, close) * (1 + rnd() * 0.012);
    const low = Math.min(open, close) * (1 - rnd() * 0.012);
    out.push({
      time: d.toISOString().slice(0, 10),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    });
    prev = close;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;
