import { seededCandles } from './candles';
import type { Company } from '../content/schemas';

export interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  /** variación diaria en % */
  changePct: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Símbolo de 3 letras: primeras letras del primer término del id (naranjas-del-turia → NAR). */
export const symbolOf = (id: string): string => id.split('-')[0]!.slice(0, 3).toUpperCase();

/**
 * Cinta del universo ficticio (CLAUDE.md §7.3): precios deterministas por empresa y día.
 * Son cifras inventadas y sin relación con las cuentas: la UI las rotula como ficticias.
 */
export function universeTicker(companies: readonly Company[], day: string): TickerItem[] {
  const dayN = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return companies.map((c) => {
    const candles = seededCandles(hash(c.id), 40, 40 + (hash(c.id) % 60), '2026-01-01');
    const i = 1 + (dayN % (candles.length - 1));
    const prev = candles[i - 1]!.close;
    const last = candles[i]!.close;
    return {
      symbol: symbolOf(c.id),
      name: c.name,
      price: last,
      changePct: ((last - prev) / prev) * 100,
    };
  });
}
