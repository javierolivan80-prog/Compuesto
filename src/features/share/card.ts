import type { StockCandle } from '../../engine/stock';
import type { Summary } from '../../engine/projections';
import type { Stock } from '../../engine/stock';

/* Datos y medidas de la tarjeta compartible (CLAUDE.md §7.5). Solo XP y progreso: nunca dinero. */

export type CardFormat = 'story' | 'post';
export type CardStyle = 'terminal' | 'papel' | 'carreras';

export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1080 },
};
export const CARD_FORMATS = Object.keys(CARD_SIZE) as CardFormat[];

export interface CardPalette {
  bg: string;
  surface: string;
  line: string;
  text: string;
  text2: string;
  brand: string;
  bull: string;
  bear: string;
  /** Color de la curva compuesta y del filete de rango. */
  gold: string;
}

/** Tres direcciones de arte con los tokens de la marca (contraste AA comprobado en tests). */
export const CARD_PALETTES: Record<CardStyle, CardPalette> = {
  terminal: {
    bg: 'oklch(0.16 0.02 255)',
    surface: 'oklch(0.2 0.022 255)',
    line: 'oklch(0.34 0.02 255)',
    text: 'oklch(0.95 0.01 85)',
    text2: 'oklch(0.74 0.02 255)',
    brand: 'oklch(0.8 0.12 85)',
    bull: 'oklch(0.76 0.17 155)',
    bear: 'oklch(0.66 0.2 25)',
    gold: 'oklch(0.8 0.12 85)',
  },
  papel: {
    bg: 'oklch(0.97 0.015 85)',
    surface: 'oklch(0.99 0.008 85)',
    line: 'oklch(0.85 0.02 85)',
    text: 'oklch(0.22 0.03 160)',
    text2: 'oklch(0.45 0.025 160)',
    brand: 'oklch(0.42 0.09 160)',
    bull: 'oklch(0.52 0.14 155)',
    bear: 'oklch(0.55 0.19 27)',
    gold: 'oklch(0.5 0.11 75)',
  },
  carreras: {
    bg: 'oklch(0.19 0.045 160)',
    surface: 'oklch(0.23 0.05 160)',
    line: 'oklch(0.36 0.05 160)',
    text: 'oklch(0.95 0.015 90)',
    text2: 'oklch(0.76 0.03 150)',
    brand: 'oklch(0.82 0.13 85)',
    bull: 'oklch(0.8 0.17 150)',
    bear: 'oklch(0.7 0.19 25)',
    gold: 'oklch(0.82 0.13 85)',
  },
};
export const CARD_STYLES = Object.keys(CARD_PALETTES) as CardStyle[];

export interface CardData {
  ticker: string;
  rank: string;
  floor: number;
  streak: number;
  /** 0–100 o null si aún no hay ejercicios. */
  accuracyPct: number | null;
  xp: number;
  /** Puntos de la acción (índice, no dinero). */
  price: number;
  dayChangePct: number;
  totalChangePct: number;
  candles: StockCandle[];
  date: string;
}

export const CARD_CANDLES = 30;

export function buildCardData(
  summary: Summary,
  stock: Stock,
  accuracy: number | null,
  date: string,
): CardData {
  return {
    ticker: stock.ticker,
    rank: summary.rank.rank,
    floor: summary.rank.floor,
    streak: summary.streak.current,
    accuracyPct: accuracy === null ? null : Math.round(accuracy * 100),
    xp: summary.xp.total,
    price: stock.price,
    dayChangePct: stock.dayChangePct,
    totalChangePct: stock.totalChangePct,
    candles: stock.candles.slice(-CARD_CANDLES),
    date,
  };
}

export const cardFilename = (f: CardFormat, s: CardStyle, date: string): string =>
  `compuesto-${f === 'story' ? 'historia' : 'post'}-${s}-${date}.png`;

/** Lee ancho y alto de un PNG (cabecera IHDR) para comprobar las medidas exactas. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b)) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}
