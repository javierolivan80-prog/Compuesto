import { inflatedPrice, purchasingPower } from '../../../engine/finance';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  basketPrice: number;
  /** % anual */
  inflationRate: number;
  years: number;
  onInteract?: (id: string) => void;
}

const H = 150;

/** La cesta sube de precio mientras lo que compran tus euros baja. */
export function InflationCart({ basketPrice, inflationRate, years, onInteract }: Props) {
  const finalPrice = inflatedPrice(basketPrice, inflationRate, years);
  const finalPower = purchasingPower(basketPrice, inflationRate, years);
  const steps: ExplainerStep[] = [
    {
      title: 'Hoy',
      text: `Una cesta cuesta ${formatEur(basketPrice, 0)} y tus ${formatEur(basketPrice, 0)} la compran entera.`,
    },
    {
      title: 'Suben los precios',
      text: `Con una inflación del ${formatNumber(inflationRate, 1)} % anual, la cesta se encarece cada año.`,
    },
    {
      title: 'Tus euros compran menos',
      text: `Tus ${formatEur(basketPrice, 0)} cubren cada vez una parte más pequeña de la cesta.`,
    },
    {
      title: `Tras ${years} años`,
      text: `La cesta cuesta ${formatEur(finalPrice, 0)} y tus ${formatEur(basketPrice, 0)} solo valen ${formatEur(finalPower, 0)} de hoy.`,
    },
  ];
  const max = finalPrice * 1.05;
  return (
    <Explainer
      explainerId="InflationCart"
      title="La cesta que se encarece"
      description={`Con una inflación del ${formatNumber(inflationRate, 1)} % anual, una cesta de ${formatEur(basketPrice, 0)} pasa a costar ${formatEur(finalPrice, 0)} en ${years} años, y ${formatEur(basketPrice, 0)} pasan a comprar lo que hoy comprarían ${formatEur(finalPower, 0)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const yr = t * years;
        const price = inflatedPrice(basketPrice, inflationRate, yr);
        const power = purchasingPower(basketPrice, inflationRate, yr);
        const h = (v: number) => (v / max) * (H - 30);
        return (
          <svg viewBox="0 0 320 170" className="h-auto w-full" role="presentation">
            <rect x="60" y={H - h(price)} width="70" height={h(price)} fill="var(--bear)" rx="4" />
            <rect
              x="190"
              y={H - h(power)}
              width="70"
              height={h(power)}
              fill="var(--brand)"
              rx="4"
            />
            <text
              x="95"
              y={H - h(price) - 6}
              textAnchor="middle"
              fill="var(--text)"
              fontSize="11"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatEur(price, 0)}
            </text>
            <text
              x="225"
              y={H - h(power) - 6}
              textAnchor="middle"
              fill="var(--text)"
              fontSize="11"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatEur(power, 0)}
            </text>
            <text x="95" y="165" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              Precio de la cesta
            </text>
            <text x="225" y="165" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              Lo que compras con {formatEur(basketPrice, 0)}
            </text>
            <text
              x="8"
              y="12"
              fill="var(--text-2)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              año {formatNumber(yr, 0)}
            </text>
          </svg>
        );
      }}
    />
  );
}
