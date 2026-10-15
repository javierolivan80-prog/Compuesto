import { formatEur } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Acciones nuevas que emite la empresa */
  newShares: number;
  price: number;
  onInteract?: (id: string) => void;
}

/** Dónde va el dinero: en el mercado primario llega a la empresa; en el secundario pasa de un inversor a otro. */
export function PrimarySecondary({ newShares, price, onInteract }: Props) {
  const amount = newShares * price;
  const fmt = (n: number) => formatEur(n, 0);
  const steps: ExplainerStep[] = [
    {
      title: 'Mercado primario',
      text: `La empresa emite ${newShares.toLocaleString('es-ES')} acciones nuevas a ${formatEur(price)}: los inversores pagan ${fmt(amount)} y ese dinero llega a la empresa.`,
    },
    {
      title: 'Las acciones ya existen',
      text: 'Tras la emisión, las acciones pasan a ser propiedad de los inversores y empiezan a cotizar.',
    },
    {
      title: 'Mercado secundario',
      text: `Si un inversor vende sus acciones a otro por ${fmt(amount)}, el dinero va del comprador al vendedor. La empresa no recibe nada.`,
    },
  ];
  return (
    <Explainer
      explainerId="PrimarySecondary"
      title="Mercado primario y secundario"
      description={`En el mercado primario, los inversores pagan ${fmt(amount)} a la empresa por ${newShares.toLocaleString('es-ES')} acciones nuevas. En el secundario, un inversor paga a otro y la empresa recibe 0 €.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 3);
        const box = (x: number, label: string, on: boolean) => (
          <g>
            <rect
              x={x}
              y="50"
              width="80"
              height="36"
              rx="4"
              fill={on ? 'var(--surface-2)' : 'var(--surface-1)'}
              stroke="var(--brand)"
            />
            <text x={x + 40} y="72" textAnchor="middle" fill="var(--text)" fontSize="11">
              {label}
            </text>
          </g>
        );
        return (
          <svg viewBox="0 0 320 130" className="h-auto w-full" role="presentation">
            {box(20, 'Inversores', true)}
            {box(220, s === 2 ? 'Otro inversor' : 'Empresa', true)}
            <line
              x1="100"
              x2="220"
              y1="68"
              y2="68"
              stroke="var(--brand)"
              strokeWidth="2"
              markerEnd=""
            />
            <text
              x="160"
              y="58"
              textAnchor="middle"
              fill="var(--brand)"
              fontSize="11"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {s === 1 ? '' : `${fmt(amount)} →`}
            </text>
            <text x="160" y="110" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {s === 2
                ? 'secundario: la empresa recibe 0 €'
                : s === 0
                  ? 'primario: la empresa recibe el dinero'
                  : 'las acciones ya cotizan'}
            </text>
          </svg>
        );
      }}
    />
  );
}
