import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Capitalización, deuda financiera, caja y EBITDA (miles de €). */
  cap: number;
  debt: number;
  cash: number;
  ebitda: number;
  onInteract?: (id: string) => void;
}

const n = (v: number) => formatNumber(Math.round(v));

/**
 * Del valor de las acciones al valor de empresa (EV): capitalización + deuda financiera − caja. Lo que costaría comprar
 * el negocio entero, sea quien sea quien lo financie; dividido entre el EBITDA da el múltiplo EV/EBITDA.
 */
export function EvBridge({ cap, debt, cash, ebitda, onInteract }: Props) {
  const ev = cap + debt - cash;
  const multiple = ev / ebitda;
  const steps: ExplainerStep[] = [
    {
      title: 'Capitalización',
      text: `Comprar todas las acciones al precio de hoy cuesta ${n(cap)} mil €: es lo que vale el patrimonio en bolsa.`,
    },
    {
      title: '+ Deuda financiera',
      text: `Quien compra el negocio entero también se queda con su deuda con bancos y bonos: ${n(debt)} mil € más.`,
    },
    {
      title: '− Caja',
      text: `Pero también se queda con su caja, ${n(cash)} mil €, que podría usar para pagar parte de esa deuda.`,
    },
    {
      title: 'Valor de empresa',
      text: `EV = ${n(cap)} + ${n(debt)} − ${n(cash)} = ${n(ev)} mil €. Entre el EBITDA (${n(ebitda)}), un EV/EBITDA de ${formatNumber(multiple, 1)}.`,
    },
  ];
  const top = Math.max(cap + debt, ev) * 1.05;
  const h = (v: number) => (v / top) * 100;
  return (
    <Explainer
      explainerId="EvBridge"
      title={t('evBridge.title')}
      description={`Capitalización de ${n(cap)} mil €, más ${n(debt)} de deuda financiera, menos ${n(cash)} de caja: un valor de empresa de ${n(ev)} mil €, ${formatNumber(multiple, 1)} veces su EBITDA de ${n(ebitda)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const base = 116;
        // cada barra va de `from` a `from + v` (en miles de €): la deuda se apila sobre la capitalización y la caja
        // cuelga desde arriba hasta el valor de empresa
        const bar = (
          x: number,
          from: number,
          v: number,
          fill: string,
          label: string,
          on: boolean,
        ) => (
          <g opacity={on ? 1 : 0.2}>
            <rect
              x={x}
              y={base - h(from + v)}
              width="54"
              height={Math.max(h(v), 1)}
              rx="3"
              fill={fill}
            />
            <text x={x + 27} y="132" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {label}
            </text>
          </g>
        );
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="8" x2="312" y1={base} y2={base} stroke="var(--line)" />
            {bar(14, 0, cap, 'var(--brand)', 'Capitalización', s >= 0)}
            {bar(90, cap, debt, 'var(--bear)', '+ Deuda', s >= 1)}
            {bar(166, cap + debt - cash, cash, 'var(--bull)', '− Caja', s >= 2)}
            {bar(242, 0, ev, 'var(--accent)', 'EV', s >= 3)}
          </svg>
        );
      }}
    />
  );
}
