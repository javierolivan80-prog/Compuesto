import { t } from '../../../i18n';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Precio pactado del futuro y unidades. */
  price: number;
  units: number;
  onInteract?: (id: string) => void;
}

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatEur(Math.abs(v), 0)}`;

/**
 * Resultado de un futuro (catálogo de ANIMACIONES, `FuturePayoff`): dos rectas cruzadas, la del comprador y la del
 * vendedor, frente al precio al vencimiento. Lo que gana uno lo pierde el otro.
 */
export function FuturePayoff({ price, units, onInteract }: Props) {
  const ends = [price - 10, price, price + 10];
  const steps: ExplainerStep[] = ends.map((p) => ({
    title: `Al vencer a ${formatNumber(p)} €`,
    text:
      p === price
        ? 'Si el precio al vencer es el pactado, nadie gana ni pierde.'
        : `El comprador ${p > price ? 'gana' : 'pierde'} ${formatEur(Math.abs((p - price) * units), 0)} y el vendedor, lo contrario: ${signed((price - p) * units)}.`,
  }));
  const x = (p: number) => 30 + ((p - (price - 15)) / 30) * 260;
  const y = (v: number) => 66 - (v / (15 * units)) * 50;
  return (
    <Explainer
      explainerId="FuturePayoff"
      title={t('futurePayoff.title')}
      description={`Futuro comprado a ${formatNumber(price)} € por ${units} unidades: si al vencer el precio es ${formatNumber(price + 10)} €, el comprador gana ${formatEur(10 * units, 0)}; si es ${formatNumber(price - 10)} €, pierde lo mismo. El vendedor, al revés.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const p = ends[stepAt(time, ends.length)]!;
        const buyer = (p - price) * units;
        return (
          <svg viewBox="0 0 320 132" className="h-auto w-full" role="presentation">
            <line x1="24" x2="300" y1="66" y2="66" stroke="var(--line)" />
            <line
              x1={x(price)}
              x2={x(price)}
              y1="12"
              y2="118"
              stroke="var(--line)"
              strokeDasharray="3 3"
            />
            <line
              x1={x(price - 15)}
              y1={y(-15 * units)}
              x2={x(price + 15)}
              y2={y(15 * units)}
              stroke="var(--brand)"
              strokeWidth="2.5"
            />
            <line
              x1={x(price - 15)}
              y1={y(15 * units)}
              x2={x(price + 15)}
              y2={y(-15 * units)}
              stroke="var(--bear)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <circle cx={x(p)} cy={y(buyer)} r="5" fill="var(--accent)" />
            <text x="296" y="20" textAnchor="end" fill="var(--text-2)" fontSize="10">
              {'Continua: comprador · discontinua: vendedor'}
            </text>
            <text x={x(p)} y="128" textAnchor="middle" fill="var(--text)" fontSize="10">
              {`${formatNumber(p)} € · ${signed(buyer)}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
