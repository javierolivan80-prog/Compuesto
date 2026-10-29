import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Efectivo de la compra (€). */
  value: number;
  /** Comisión del bróker, media horquilla y coste de impacto (pb del efectivo). */
  commBp: number;
  spreadBp: number;
  impactBp: number;
  onInteract?: (id: string) => void;
}

/** Impuesto sobre las transacciones financieras: 0,2 % = 20 pb. */
const ITF_BP = 20;

const bp = (v: number) => `${formatNumber(v, 1)}\u00a0pb`;
const money = (v: number) => `${formatNumber(Math.round(v), 0)}\u00a0€`;

/**
 * Costes reales de operar (ANIMACIONES §2, `CostStack`): la barra de costes de una compra se apila capa a capa. Primero
 * los explícitos, que salen en el extracto (comisión e impuesto sobre las transacciones financieras); luego los
 * implícitos, que no salen en ningún papel (media horquilla y coste de impacto). Cifras en pb del efectivo y en €.
 */
export function CostStack({ value, commBp, spreadBp, impactBp, onInteract }: Props) {
  const layers = [
    { key: 'comm', label: 'Comisión', pb: commBp, explicit: true },
    { key: 'itf', label: 'Impuesto', pb: ITF_BP, explicit: true },
    { key: 'spread', label: 'Horquilla', pb: spreadBp, explicit: false },
    { key: 'impact', label: 'Impacto', pb: impactBp, explicit: false },
  ];
  const eur = (pb: number) => (value * pb) / 10_000;
  const sum = (n: number) => layers.slice(0, n).reduce((a, l) => a + l.pb, 0);
  const explicitBp = commBp + ITF_BP;
  const implicitBp = spreadBp + impactBp;
  const total = sum(4);
  const steps: ExplainerStep[] = [
    {
      title: 'Comisión',
      text: `Compras ${money(value)}. La comisión del bróker es de ${bp(commBp)}: ${money(eur(commBp))}. Es lo primero que se mira, y lo que menos pesa.`,
    },
    {
      title: 'Impuesto',
      text: `Si es una empresa española de más de 1.000 M€ de capitalización, el impuesto sobre las transacciones financieras suma ${bp(ITF_BP)}: ${money(eur(ITF_BP))}. Costes explícitos: ${bp(explicitBp)}.`,
    },
    {
      title: 'Horquilla',
      text: `Comprar al ask y no al punto medio cuesta la media horquilla: ${bp(spreadBp)}, ${money(eur(spreadBp))}. No sale en el extracto: es un coste implícito.`,
    },
    {
      title: 'Impacto',
      text: `Tu orden mueve el precio: ${bp(impactBp)} más. Implícitos: ${bp(implicitBp)}, frente a ${bp(explicitBp)} de explícitos. Total: ${bp(total)}, ${money(eur(total))}.`,
    },
  ];
  const W = 260;
  const scale = W / Math.max(total, 1);
  return (
    <Explainer
      explainerId="CostStack"
      title={t('costStack.title')}
      description={`Costes de una compra de ${money(value)}: comisión ${bp(commBp)} e impuesto ${bp(ITF_BP)} (explícitos, ${bp(explicitBp)}); media horquilla ${bp(spreadBp)} e impacto ${bp(impactBp)} (implícitos, ${bp(implicitBp)}). Total ${bp(total)}, ${money(eur(total))}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const shown = s + 1;
        let x = 30;
        return (
          <svg viewBox="0 0 320 120" className="h-auto w-full" role="presentation">
            <rect
              x="30"
              y="30"
              width={W}
              height="26"
              rx="3"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            {layers.slice(0, shown).map((l, i) => {
              const w = l.pb * scale;
              const g = (
                <g key={l.key}>
                  <rect
                    x={x}
                    y="30"
                    width={w}
                    height="26"
                    fill={l.explicit ? 'var(--accent)' : 'var(--bear)'}
                    opacity={l.explicit ? 0.75 : 0.5}
                    stroke="var(--surface-1)"
                  />
                  <text
                    x={x + w / 2}
                    y={72 + (i % 2) * 12}
                    textAnchor="middle"
                    fill="var(--text-2)"
                    fontSize="9"
                  >
                    {l.label}
                  </text>
                </g>
              );
              x += w;
              return g;
            })}
            <text x="30" y="20" fill="var(--text-2)" fontSize="9">
              {t('costStack.legend')}
            </text>
            <text x="160" y="104" textAnchor="middle" fill="var(--text)" fontSize="11">
              {`${bp(sum(shown))} · ${money(eur(sum(shown)))}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
