import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import type { Candle } from '../engine/candles';
import { oklchToHex, parseOklch } from '../engine/color';
import { formatDelta, formatEur } from '../lib/format';
import { useTheme } from '../design/ThemeProvider';

interface Props {
  candles: Candle[];
  label: string;
  height?: number;
  /** Cómo se leen los precios en la descripción textual (por defecto, euros). */
  formatValue?: (n: number) => string;
  /** Nota final de la descripción; por defecto avisa de que son datos de ejemplo. Cadena vacía para omitirla. */
  note?: string;
}

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** lightweight-charts no entiende OKLCH: se convierte el token del tema a hex. */
const FALLBACK: Record<string, string> = {
  '--text-2': '#9aa4b2',
  '--line': '#3a4350',
  '--bull': '#3fbf7f',
  '--bear': '#e0524a',
};
const chartColor = (name: string) => {
  try {
    return oklchToHex(parseOklch(cssVar(name)));
  } catch {
    // sin tokens (p. ej. en tests) o color no interpretable: un color neutro antes que romper la pantalla
    return FALLBACK[name] ?? '#888888';
  }
};

/** Velas con lightweight-charts. Descripción textual para lector de pantalla (CLAUDE.md §10). */
export function CandleChart({
  candles,
  label,
  height = 240,
  formatValue = formatEur,
  note = 'Datos de ejemplo.',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = createChart(el, {
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartColor('--text-2'),
        fontFamily: cssVar('--font-mono'),
      },
      grid: { vertLines: { visible: false }, horzLines: { color: chartColor('--line') } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    chartRef.current = chart;
    const series = chart.addSeries(CandlestickSeries, {
      upColor: chartColor('--bull'),
      downColor: chartColor('--bear'),
      wickUpColor: chartColor('--bull'),
      wickDownColor: chartColor('--bear'),
      borderVisible: false,
    });
    series.setData(
      candles.map((c) => ({
        time: (Date.parse(`${c.time}T00:00:00Z`) / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, height, theme]);

  const first = candles[0];
  const last = candles[candles.length - 1];
  const pct = first && last ? ((last.close - first.open) / first.open) * 100 : 0;
  const summary =
    first && last
      ? `${label}: ${candles.length} velas diarias, de ${formatValue(first.open)} a ${formatValue(last.close)} (${formatDelta(pct)}).${note ? ` ${note}` : ''}`
      : label;

  return (
    <figure className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      {/* inert: el canvas no entra en el árbol de accesibilidad; el resumen textual de abajo lo describe */}
      <div ref={ref} inert className="min-w-0" style={{ height }} />
      <figcaption className="text-text-2 text-sm">{summary}</figcaption>
    </figure>
  );
}
