import { freeFloatShares, marketCap } from '../../../engine/finance';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  price: number;
  shares: number;
  /** % de las acciones que cotiza libremente */
  freeFloat: number;
  onInteract?: (id: string) => void;
}

/** Capitalización = precio × acciones; el free float es la parte que cotiza libremente. */
export function MarketCapFloat({ price, shares, freeFloat, onInteract }: Props) {
  const cap = marketCap(price, shares);
  const ffShares = freeFloatShares(shares, freeFloat);
  const ffCap = marketCap(price, ffShares);
  const m = (n: number) => `${formatNumber(n / 1_000_000, 1)} M`;
  const steps: ExplainerStep[] = [
    {
      title: 'Las acciones en circulación',
      text: `La empresa tiene ${m(shares)} de acciones, cada una cotiza a ${formatEur(price)}.`,
    },
    {
      title: 'Capitalización bursátil',
      text: `${formatEur(price)} × ${m(shares)} = ${m(cap)} € de capitalización: lo que vale la empresa según el mercado.`,
    },
    {
      title: 'Quién no vende',
      text: `Los accionistas de control mantienen el ${formatNumber(100 - freeFloat, 0)} % de las acciones y no suelen venderlas.`,
    },
    {
      title: 'El free float',
      text: `El ${formatNumber(freeFloat, 0)} % restante (${m(ffShares)} de acciones, ${m(ffCap)} €) es el free float: lo que cotiza libremente.`,
    },
  ];
  return (
    <Explainer
      explainerId="MarketCapFloat"
      title="Capitalización y free float"
      description={`Con ${m(shares)} de acciones a ${formatEur(price)}, la capitalización es de ${m(cap)} €. El free float es el ${formatNumber(freeFloat, 0)} % de las acciones: ${m(ffShares)} de acciones, que valen ${m(ffCap)} €.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const split = 20 + 280 * ((100 - freeFloat) / 100);
        const showSplit = t > 0.5;
        const showCap = t > 0.2;
        return (
          <svg viewBox="0 0 320 130" className="h-auto w-full" role="presentation">
            <rect
              x="20"
              y="50"
              width="280"
              height="36"
              rx="4"
              fill="var(--surface-1)"
              stroke="var(--brand)"
            />
            {showSplit && (
              <>
                <rect
                  x="20"
                  y="50"
                  width={split - 20}
                  height="36"
                  rx="4"
                  fill="var(--surface-2)"
                  stroke="var(--brand)"
                />
                <rect
                  x={split}
                  y="50"
                  width={300 - split}
                  height="36"
                  rx="4"
                  fill="var(--brand)"
                  opacity={0.85}
                />
                <text
                  x={20 + (split - 20) / 2}
                  y="72"
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="11"
                >
                  control {formatNumber(100 - freeFloat, 0)} %
                </text>
                <text
                  x={split + (300 - split) / 2}
                  y="72"
                  textAnchor="middle"
                  fill="var(--bg)"
                  fontSize="11"
                >
                  free float {formatNumber(freeFloat, 0)} %
                </text>
              </>
            )}
            {showCap && (
              <text
                x="20"
                y="32"
                fill="var(--text)"
                fontSize="12"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                capitalización {m(cap)} €
              </text>
            )}
            <text x="20" y="112" fill="var(--text-2)" fontSize="10">
              {m(shares)} de acciones × {formatEur(price)}
            </text>
          </svg>
        );
      }}
    />
  );
}
