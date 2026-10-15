import { Button } from '../../components/Button';
import { formatDelta, formatNumber } from '../../lib/format';

export interface TickerItem {
  symbol: string;
  price: number;
  changePct: number;
}

interface Props {
  ticker: TickerItem[];
  headline: string;
  challengeMinutes: number;
  onOpen: () => void;
}

/** Home (variante A elegida en 0.6): ticker + portada de periódico financiero ficticio con el reto del día. */
export function Briefing({ ticker, headline, challengeMinutes, onOpen }: Props) {
  return (
    <div className="grid gap-4">
      <ul
        aria-label="Ticker del universo Compuesto"
        className="text-text-2 flex flex-wrap justify-between gap-x-4 text-xs"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {ticker.map((t) => (
          <li key={t.symbol} data-num>
            {t.symbol} {formatNumber(t.price, 2)}{' '}
            <span className={t.changePct >= 0 ? 'text-bull' : 'text-bear'}>
              {formatDelta(t.changePct)}
            </span>
          </li>
        ))}
      </ul>
      <article className="border-line grid gap-2 border-y-2 py-4">
        <p className="text-text-2 text-xs tracking-widest uppercase">
          Albufera Gazette · edición de la mañana
        </p>
        <h2 className="text-4xl leading-tight">{headline}</h2>
        <p className="text-text-2">Reto del día · {challengeMinutes} min</p>
      </article>
      <Button onClick={onOpen}>Abrir mercado</Button>
    </div>
  );
}
