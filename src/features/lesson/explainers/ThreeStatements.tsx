import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Importe de la venta a crédito (miles de €). */
  sale: number;
  /** Coste de la mercancía vendida (miles de €). */
  cost: number;
  onInteract?: (id: string) => void;
}

const n = (v: number) => `${v >= 0 ? '+' : '−'}${formatNumber(Math.abs(v))}`;

/**
 * Cómo se conectan los tres estados (ANIMACIONES §2, `ThreeStatements`): una venta a crédito entra en la cuenta de
 * resultados, cambia el balance y no mueve la caja hasta que el cliente paga.
 */
export function ThreeStatements({ sale, cost, onInteract }: Props) {
  const margin = sale - cost;
  const steps: ExplainerStep[] = [
    {
      title: 'Cuenta de resultados',
      text: `Se vende por ${formatNumber(sale)} lo que costó ${formatNumber(cost)}: ingresos ${n(sale)}, coste de ventas ${n(-cost)} y beneficio ${n(margin)}. Se apunta al vender, aunque aún no se haya cobrado.`,
    },
    {
      title: 'Balance',
      text: `Clientes ${n(sale)} y existencias ${n(-cost)} en el activo; el beneficio, ${n(margin)}, sube el patrimonio neto. Activo y patrimonio neto más pasivo suben lo mismo: ${n(margin)}.`,
    },
    {
      title: 'Flujos de caja, hoy',
      text: `La caja no se mueve: al beneficio (${n(margin)}) se le resta lo que te deben los clientes (${n(-sale)}) y se le suma el zumo que ha salido del almacén (${n(cost)}). Flujo de explotación: 0.`,
    },
    {
      title: '60 días después: el cobro',
      text: `El cliente paga: caja ${n(sale)} y clientes ${n(-sale)}. El beneficio no cambia: ya se apuntó al vender. Contando desde la venta, el flujo de explotación es ${n(sale)}: el beneficio (${n(margin)}) más el zumo que salió del almacén (${n(cost)}).`,
    },
  ];
  return (
    <Explainer
      explainerId="ThreeStatements"
      title={t('threeStatements.title')}
      description={`Una venta a crédito de ${formatNumber(sale)} con un coste de ${formatNumber(cost)} da un beneficio de ${formatNumber(margin)} en la cuenta de resultados el día de la venta. En el balance suben los clientes, bajan las existencias y sube el patrimonio neto. La caja no se mueve hasta que el cliente paga: ese día el flujo de explotación recoge ${formatNumber(sale)} y el beneficio ya no cambia.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 4);
        const box = (x: number, title: string, lines: [string, string][], on: boolean) => (
          <g opacity={on ? 1 : 0.35}>
            <rect
              x={x}
              y="8"
              width="96"
              height="124"
              rx="8"
              fill="var(--surface-2)"
              stroke={on ? 'var(--accent)' : 'var(--line)'}
            />
            <text x={x + 48} y="26" textAnchor="middle" fill="var(--text)" fontSize="10">
              {title}
            </text>
            {lines.map(([label, value], i) => (
              <g key={label}>
                <text x={x + 8} y={46 + i * 20} fill="var(--text-2)" fontSize="8">
                  {label}
                </text>
                <text
                  x={x + 88}
                  y={46 + i * 20 + 9}
                  textAnchor="end"
                  fill="var(--text)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  {value}
                </text>
              </g>
            ))}
          </g>
        );
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            {box(
              4,
              'Resultados',
              [
                ['Ingresos', n(sale)],
                ['Coste de ventas', n(-cost)],
                ['Beneficio', n(margin)],
              ],
              s === 0,
            )}
            {box(
              112,
              'Balance',
              s >= 3
                ? [
                    ['Caja', n(sale)],
                    ['Clientes', '0'],
                    ['Existencias', n(-cost)],
                    ['Patrimonio neto', n(margin)],
                  ]
                : [
                    ['Clientes', n(sale)],
                    ['Existencias', n(-cost)],
                    ['Patrimonio neto', n(margin)],
                  ],
              s === 1 || s === 3,
            )}
            {box(
              220,
              'Caja',
              [
                ['Beneficio', n(margin)],
                ['Circulante', s >= 3 ? n(sale - margin) : n(-margin)],
                ['Explotación', s >= 3 ? n(sale) : '0'],
              ],
              s >= 2,
            )}
          </svg>
        );
      }}
    />
  );
}
