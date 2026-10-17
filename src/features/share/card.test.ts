import { describe, expect, it } from 'vitest';
import { contrastRatio, parseOklch } from '../../engine/color';
import type { Summary } from '../../engine/projections';
import { stockFromDays } from '../../engine/stock';
import {
  CARD_PALETTES,
  CARD_SIZE,
  CARD_STYLES,
  buildCardData,
  cardFilename,
  pngSize,
  type CardPalette,
} from './card';

const c = (v: string) => parseOklch(v);

describe('medidas', () => {
  it('historia 1080×1920 y post 1080×1080', () => {
    expect(CARD_SIZE.story).toEqual({ width: 1080, height: 1920 });
    expect(CARD_SIZE.post).toEqual({ width: 1080, height: 1080 });
  });
  it('lee las dimensiones de un PNG', () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(png.buffer).setUint32(16, 1080);
    new DataView(png.buffer).setUint32(20, 1920);
    expect(pngSize(png)).toEqual({ width: 1080, height: 1920 });
    expect(pngSize(new Uint8Array(24))).toBeNull();
    expect(pngSize(new Uint8Array(3))).toBeNull();
  });
  it('el nombre de archivo lleva formato, estilo y fecha', () => {
    expect(cardFilename('story', 'papel', '2026-10-17')).toBe(
      'compuesto-historia-papel-2026-10-17.png',
    );
    expect(cardFilename('post', 'terminal', '2026-10-17')).toBe(
      'compuesto-post-terminal-2026-10-17.png',
    );
  });
});

describe('contraste de los 3 estilos (AA ≥ 4,5:1)', () => {
  const pairs: [keyof CardPalette, keyof CardPalette][] = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['text2', 'bg'],
    ['text2', 'surface'],
    ['brand', 'bg'],
    ['brand', 'surface'],
    ['bull', 'surface'],
    ['bear', 'surface'],
    ['gold', 'bg'],
  ];
  for (const style of CARD_STYLES)
    for (const [fg, bg] of pairs)
      it(`${style}: ${fg} sobre ${bg}`, () => {
        const p = CARD_PALETTES[style];
        expect(contrastRatio(c(p[fg]), c(p[bg]))).toBeGreaterThanOrEqual(4.5);
      });
});

describe('datos de la tarjeta', () => {
  const summary = {
    rank: { rank: 'Analista Junior', floor: 1 },
    streak: { current: 12 },
    xp: { total: 1234 },
  } as unknown as Summary;
  const stock = stockFromDays(
    Array.from({ length: 40 }, (_, i) => ({
      day: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      xp: 50,
      accuracy: 0.9,
    })),
    '2026-09-28',
    'jav',
  );
  it('solo lleva XP y progreso, con las velas recortadas a 30 días', () => {
    const d = buildCardData(summary, stock, 0.876, '2026-10-17');
    expect(d).toMatchObject({
      rank: 'Analista Junior',
      streak: 12,
      xp: 1234,
      accuracyPct: 88,
      ticker: '$JAV',
    });
    expect(d.candles.length).toBeLessThanOrEqual(30);
    expect(Object.keys(d).some((k) => /eur|money|dinero|saldo|euro/i.test(k))).toBe(false);
  });
  it('sin ejercicios la precisión es null', () => {
    expect(buildCardData(summary, stock, null, '2026-10-17').accuracyPct).toBeNull();
  });
});
