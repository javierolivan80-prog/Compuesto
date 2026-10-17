import { lazy, Suspense } from 'react';
import type { Stock } from '../engine/stock';
import { t } from '../i18n';
import { formatDelta, formatNumber } from '../lib/format';

const CandleChart = lazy(() => import('./CandleChart').then((m) => ({ default: m.CandleChart })));

/** Tu acción ($JAV): precio, variación del día y velas diarias. Racha = tendencia; perderla = «corrección». */
export function StockPanel({
  stock,
  days = 60,
  height = 180,
}: {
  stock: Stock;
  days?: number;
  height?: number;
}) {
  const candles = stock.candles.slice(-days);
  const up = stock.dayChangePct >= 0;
  return (
    <section
      aria-labelledby="stock-title"
      className="bg-surface-1 border-line grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-[var(--radius-md)] border p-4"
      data-testid="my-stock"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="stock-title" className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
          {stock.ticker}
        </h2>
        {candles.length > 0 && (
          <p data-num className="ml-auto text-right whitespace-nowrap">
            <span className="text-xl" data-testid="stock-price">
              {formatNumber(stock.price, 2)}
            </span>{' '}
            <span className={up ? 'text-bull' : 'text-bear'}>
              {formatDelta(stock.dayChangePct)}
            </span>
          </p>
        )}
      </div>
      {candles.length === 0 ? (
        <p className="text-text-2 text-sm">{t('stock.empty')}</p>
      ) : (
        <>
          <Suspense fallback={<div style={{ height }} />}>
            <CandleChart
              candles={candles}
              label={t('stock.label', { ticker: stock.ticker })}
              formatValue={(n) => t('stock.points', { n: formatNumber(n, 2) })}
              note={t('stock.note')}
              height={height}
            />
          </Suspense>
          <p className="text-text-2 text-sm">
            {stock.dayChangePct < 0 ? t('stock.correction') : t('stock.rising')}
          </p>
        </>
      )}
    </section>
  );
}
