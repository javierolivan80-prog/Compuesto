import { marketBuy, spread, type Level } from '../../../engine/orderbook';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  asks: Level[];
  bids: Level[];
  /** Acciones de la orden de compra a mercado */
  buySize: number;
  onInteract?: (id: string) => void;
}

/** Libro de órdenes: una orden de compra a mercado "come" los niveles de venta y el precio salta. */
export function OrderBook({ asks, bids, buySize, onInteract }: Props) {
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
  const sortedBids = [...bids].sort((a, b) => b.price - a.price);
  const bestAsk = sortedAsks[0]!;
  const bestBid = sortedBids[0]!;
  const gap = spread(bestBid.price, bestAsk.price);
  const fill = marketBuy(sortedAsks, buySize);
  const maxQty = Math.max(...sortedAsks.map((l) => l.qty), ...sortedBids.map((l) => l.qty));
  const steps: ExplainerStep[] = [
    {
      title: 'La horquilla',
      text: `Mejor precio de compra: ${formatEur(bestBid.price)}. Mejor precio de venta: ${formatEur(bestAsk.price)}. La diferencia, ${formatEur(gap)}, es la horquilla.`,
    },
    {
      title: 'Una orden a mercado',
      text: `Una orden de compra a mercado de ${formatNumber(buySize, 0)} acciones se ejecuta contra las ventas más baratas, de una en una.`,
    },
    {
      title: 'El precio salta',
      text: `Se pagan ${fill.fills.map((f) => `${formatNumber(f.qty, 0)} a ${formatEur(f.price)}`).join(' y ')}: precio medio ${formatEur(fill.avgPrice ?? 0)} y última operación a ${formatEur(fill.lastPrice ?? 0)}.`,
    },
  ];
  return (
    <Explainer
      explainerId="OrderBook"
      title="Libro de órdenes"
      description={`Mejor compra ${formatEur(bestBid.price)}, mejor venta ${formatEur(bestAsk.price)}, horquilla ${formatEur(gap)}. Una compra a mercado de ${formatNumber(buySize, 0)} acciones paga ${fill.fills.map((f) => `${formatNumber(f.qty, 0)} a ${formatEur(f.price)}`).join(' y ')}; precio medio ${formatEur(fill.avgPrice ?? 0)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 3);
        const row = (l: Level, i: number, side: 'ask' | 'bid') => {
          const eaten =
            side === 'ask' && s >= 1 ? (fill.fills.find((f) => f.price === l.price)?.qty ?? 0) : 0;
          const y =
            side === 'ask'
              ? 10 + (sortedAsks.length - 1 - i) * 20
              : 20 + sortedAsks.length * 20 + i * 20;
          const w = (l.qty / maxQty) * 140;
          return (
            <g key={`${side}${l.price}`}>
              <text
                x="8"
                y={y + 12}
                fill="var(--text)"
                fontSize="10"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {formatEur(l.price)}
              </text>
              <rect
                x="70"
                y={y}
                width={w}
                height="14"
                rx="2"
                fill={side === 'ask' ? 'var(--bear)' : 'var(--bull)'}
                opacity={0.8}
              />
              {eaten > 0 && (
                <rect
                  x="70"
                  y={y}
                  width={(eaten / maxQty) * 140}
                  height="14"
                  rx="2"
                  fill="var(--text)"
                  opacity={0.5}
                />
              )}
              <text
                x={74 + w}
                y={y + 11}
                fill="var(--text-2)"
                fontSize="9"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {formatNumber(l.qty, 0)}
              </text>
            </g>
          );
        };
        const h = 30 + (sortedAsks.length + sortedBids.length) * 20;
        return (
          <svg viewBox={`0 0 320 ${h}`} className="h-auto w-full" role="presentation">
            {sortedAsks.map((l, i) => row(l, i, 'ask'))}
            {sortedBids.map((l, i) => row(l, i, 'bid'))}
            <text x="230" y="24" fill="var(--text-2)" fontSize="9">
              venta (rojo)
            </text>
            <text x="230" y={h - 8} fill="var(--text-2)" fontSize="9">
              compra (verde)
            </text>
            {s >= 2 && (
              <text
                x="230"
                y={h / 2}
                fill="var(--text)"
                fontSize="10"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                último {formatEur(fill.lastPrice ?? 0)}
              </text>
            )}
          </svg>
        );
      }}
    />
  );
}
