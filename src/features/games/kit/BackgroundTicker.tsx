import { useEffect, useState } from 'react';
import { formatDelta, formatNumber } from '../../../lib/format';

export interface TickerCell {
  symbol: string;
  price: number;
  changePct: number;
}

/** Cinta lenta de fondo al 30 % de opacidad. Se pausa en momentos clave (`paused`) y con la pestaña oculta. */
export function BackgroundTicker({
  items,
  paused = false,
}: {
  items: TickerCell[];
  paused?: boolean;
}) {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const row = (suffix: string) =>
    items.map((t) => (
      <span key={`${t.symbol}${suffix}`} data-num className="mr-8 inline-block">
        {t.symbol} {formatNumber(t.price, 2)} <span>{formatDelta(t.changePct)}</span>
      </span>
    ));
  return (
    <div
      className="kit-ticker text-text-2 pointer-events-none overflow-hidden whitespace-nowrap text-xs opacity-30"
      data-paused={paused || hidden ? 'true' : 'false'}
      aria-hidden="true"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="kit-ticker-track inline-block">
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
