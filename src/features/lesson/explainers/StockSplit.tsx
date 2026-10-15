import { marketCap, stockSplit } from '../../../engine/finance';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  price: number;
  shares: number;
  ratio: number;
  onInteract?: (id: string) => void;
}

/** Split N×1: una acción se parte en N; el valor total no cambia. */
export function StockSplit({ price, shares, ratio, onInteract }: Props) {
  const after = stockSplit(price, shares, ratio);
  const cap = marketCap(price, shares);
  const steps: ExplainerStep[] = [
    {
      title: 'Antes del split',
      text: `${formatNumber(shares, 0)} acciones a ${formatEur(price)}: capitalización de ${formatEur(cap, 0)}.`,
    },
    {
      title: `Split ${ratio} por 1`,
      text: `Cada acción se parte en ${ratio}: ahora hay ${formatNumber(after.shares, 0)} acciones y el precio es ${formatEur(after.price)}.`,
    },
    {
      title: 'El valor total no cambia',
      text: `${formatNumber(after.shares, 0)} × ${formatEur(after.price)} = ${formatEur(cap, 0)}. Tu parte de la empresa es la misma; solo cambia el número de piezas.`,
    },
  ];
  return (
    <Explainer
      explainerId="StockSplit"
      title="Split de acciones"
      description={`Antes: ${formatNumber(shares, 0)} acciones a ${formatEur(price)}. Tras un split ${ratio} por 1: ${formatNumber(after.shares, 0)} acciones a ${formatEur(after.price)}. La capitalización es la misma: ${formatEur(cap, 0)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 3);
        const pieces = s >= 1 ? ratio : 1;
        const w = 240 / pieces;
        return (
          <svg viewBox="0 0 320 90" className="h-auto w-full" role="presentation">
            {Array.from({ length: pieces }, (_, i) => (
              <rect
                key={i}
                x={40 + i * w}
                y="20"
                width={w - 4}
                height="40"
                rx="3"
                fill="var(--brand)"
                opacity={0.85}
              />
            ))}
            <text
              x="40"
              y="80"
              fill="var(--text-2)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {s >= 1
                ? `${ratio} piezas a ${formatEur(after.price)}`
                : `1 pieza a ${formatEur(price)}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
