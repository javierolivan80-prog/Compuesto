import { forwardRef, type CSSProperties } from 'react';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import {
  CARD_PALETTES,
  CARD_SIZE,
  type CardData,
  type CardFormat,
  type CardPalette,
  type CardStyle,
} from './card';

const MONO = 'var(--font-mono)';
const SERIF = 'var(--font-display)';
const SANS = 'var(--font-sans)';

function Candles({ data, p, w, h }: { data: CardData; p: CardPalette; w: number; h: number }) {
  const cs = data.candles;
  if (cs.length === 0) return null;
  const lo = Math.min(...cs.map((c) => c.low));
  const hi = Math.max(...cs.map((c) => c.high));
  const y = (v: number) => h - 12 - ((v - lo) / (hi - lo || 1)) * (h - 24);
  const step = w / cs.length;
  const bw = Math.max(6, step * 0.55);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {cs.map((c, i) => {
        const up = c.close >= c.open;
        const color = up ? p.bull : p.bear;
        const x = i * step + step / 2;
        const top = y(Math.max(c.open, c.close));
        const bottom = y(Math.min(c.open, c.close));
        return (
          <g key={c.time}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={3} />
            <rect
              x={x - bw / 2}
              y={top}
              width={bw}
              height={Math.max(3, bottom - top)}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** La curva del interés compuesto: el logo, dibujado a todo el ancho. */
function CompoundCurve({ p, w, h }: { p: CardPalette; w: number; h: number }) {
  const pts = Array.from({ length: 41 }, (_, i) => {
    const x = (i / 40) * w;
    const y = h - 10 - ((Math.exp((i / 40) * 4.2) - 1) / (Math.exp(4.2) - 1)) * (h - 24);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <line x1={0} x2={w} y1={h - 10} y2={h - 10} stroke={p.line} strokeWidth={2} />
      <path d={pts} fill="none" stroke={p.gold} strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
}

const delta = (n: number) => `${n >= 0 ? '+' : '−'}${formatNumber(Math.abs(n), 2)} %`;

interface Props {
  data: CardData;
  format: CardFormat;
  cardStyle: CardStyle;
}

/**
 * Tarjeta compartible estilo captura de terminal. Tamaño fijo en píxeles (1080×1920 o 1080×1080) para que la imagen
 * exportada salga exacta; la vista previa la reduce con transform. Solo XP y progreso, nunca dinero.
 */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { data, format, cardStyle },
  ref,
) {
  const p = CARD_PALETTES[cardStyle];
  const { width, height } = CARD_SIZE[format];
  const story = format === 'story';
  const pad = story ? 80 : 72;
  const inner = width - pad * 2;
  const root: CSSProperties = {
    width,
    height,
    boxSizing: 'border-box',
    padding: pad,
    background: p.bg,
    color: p.text,
    fontFamily: SANS,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  };
  const label: CSSProperties = {
    fontFamily: SANS,
    fontSize: 26,
    letterSpacing: 6,
    textTransform: 'uppercase',
    color: p.text2,
  };
  const up = data.dayChangePct >= 0;
  const stats: { k: string; v: string; unit?: string }[] = [
    {
      k: t('share.streak'),
      v: formatNumber(data.streak),
      unit: data.streak === 1 ? t('share.day') : t('share.days'),
    },
    {
      k: t('share.accuracy'),
      v: data.accuracyPct === null ? '—' : formatNumber(data.accuracyPct),
      unit: data.accuracyPct === null ? undefined : '%',
    },
    { k: t('share.xp'), v: formatNumber(data.xp) },
  ];

  const stockPanel = (
    <div
      style={{
        background: p.surface,
        border: `2px solid ${p.line}`,
        borderRadius: 16,
        padding: story ? 36 : 28,
        display: 'grid',
        gap: story ? 16 : 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: story ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: story ? 'baseline' : 'flex-start',
          gap: story ? 0 : 6,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: story ? 48 : 38 }}>{data.ticker}</span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: story ? 64 : 56,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatNumber(data.price, 2)}{' '}
          <span
            style={{
              fontSize: story ? 34 : 30,
              color: up ? p.bull : p.bear,
              whiteSpace: 'nowrap',
            }}
          >
            {up ? '▲' : '▼'} {delta(data.dayChangePct)}
          </span>
        </span>
      </div>
      <Candles data={data} p={p} w={story ? inner - 72 : 392} h={story ? 360 : 220} />
      <span style={{ ...label, fontSize: 22, letterSpacing: 3 }}>{t('share.points')}</span>
    </div>
  );

  const statsRow = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: story ? '1fr 1fr 1fr' : '1fr',
        gap: story ? 24 : 14,
      }}
    >
      {stats.map(({ k, v, unit }) => (
        <div
          key={k}
          style={{
            display: 'flex',
            flexDirection: story ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: story ? 'flex-start' : 'baseline',
            gap: story ? 6 : 12,
            borderBottom: story ? 'none' : `2px solid ${p.line}`,
            paddingBottom: story ? 0 : 10,
          }}
        >
          <span style={{ ...label, fontSize: story ? 24 : 22, letterSpacing: story ? 4 : 3 }}>
            {k}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: story ? 72 : 46,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {v}
            {unit && <span style={{ fontSize: story ? 30 : 26, color: p.text2 }}> {unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );

  const rankBlock = (
    <div style={{ display: 'grid', gap: story ? 18 : 12 }}>
      <span style={label}>{t('share.rank')}</span>
      <span style={{ fontFamily: SERIF, fontSize: story ? 150 : 88, lineHeight: 1.02 }}>
        {data.rank}
      </span>
      <span style={{ width: 320, height: 4, background: p.gold, display: 'block' }} />
      <span style={{ fontFamily: MONO, fontSize: story ? 34 : 28, color: p.text2 }}>
        {t('share.floor', { n: data.floor })}
      </span>
    </div>
  );

  return (
    <div
      ref={ref}
      style={root}
      data-testid="share-card"
      data-format={format}
      data-style={cardStyle}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: SERIF, fontSize: 64, color: p.brand }}>{t('share.brand')}</span>
        <span style={{ fontFamily: MONO, fontSize: 28, color: p.text2 }}>{data.date}</span>
      </header>

      {story ? (
        <>
          {rankBlock}
          {stockPanel}
          {statsRow}
          <CompoundCurve p={p} w={inner} h={220} />
        </>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '440px 1fr',
              gap: 40,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'grid', gap: 30 }}>
              {rankBlock}
              {statsRow}
            </div>
            {stockPanel}
          </div>
          <CompoundCurve p={p} w={inner} h={90} />
        </>
      )}

      <footer style={{ display: 'grid', gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontSize: 46, fontStyle: 'italic', color: p.brand }}>
          {t('share.slogan')}
        </span>
        <span style={{ fontSize: 24, color: p.text2 }}>{t('share.disclaimer')}</span>
      </footer>
    </div>
  );
});
