import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Probabilidad de impago a un año (%). */
  pd: number;
  /** Pérdida si impaga (%). */
  lgd: number;
  /** Exposición en el momento del impago (miles de €). */
  ead: number;
  onInteract?: (id: string) => void;
}

/** Sin ceros sobrantes: 9, 19,2, 3,75. */
const num = (v: number) =>
  formatNumber(v, Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2);
const pct = (v: number) => `${num(v)}\u00a0%`;
const keur = (v: number) => `${num(v)}\u00a0mil\u00a0€`;

/**
 * Pérdida esperada (ANIMACIONES §2, `CreditRisk`): PD × LGD × EAD como tres capas que se multiplican. La barra de
 * la EAD se recorta a lo que se perdería si impaga (LGD) y después a la media que se espera perder (PD). El último
 * paso separa la pérdida esperada, que cubren el precio y las provisiones, de la inesperada, que cubre el capital.
 */
export function CreditRisk({ pd, lgd, ead, onInteract }: Props) {
  const loss = Math.round(ead * lgd) / 100;
  const el = Math.round(ead * lgd * pd) / 10_000;
  const steps: ExplainerStep[] = [
    {
      title: 'EAD',
      text: `Si el cliente impagara, el banco tendría expuestos ${keur(ead)}: es la exposición en el impago.`,
    },
    {
      title: 'LGD',
      text: `Tras recuperar lo que pueda (garantías, concurso), perdería el ${pct(lgd)}: ${keur(loss)}.`,
    },
    {
      title: 'PD',
      text: `Pero solo impaga con una probabilidad del ${pct(pd)} al año: pérdida esperada = ${pct(pd)} × ${pct(lgd)} × ${keur(ead)} = ${keur(el)}.`,
    },
    {
      title: 'Inesperada',
      text: 'Es una media: en un año malo se puede perder mucho más. La pérdida esperada la cubren el precio del préstamo y las provisiones; la inesperada, el capital.',
    },
  ];
  return (
    <Explainer
      explainerId="CreditRisk"
      title={t('creditRisk.title')}
      description={`Exposición de ${keur(ead)}; si impaga se perdería el ${pct(lgd)}, ${keur(loss)}; con una probabilidad de impago del ${pct(pd)}, la pérdida esperada es ${keur(el)}. La esperada la cubren el precio y las provisiones; la inesperada, el capital.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const full = 240;
        const wLoss = (full * lgd) / 100;
        // la pérdida esperada es tan pequeña que se dibuja con un mínimo visible
        const wEl = Math.max(3, (wLoss * pd) / 100);
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <text x="40" y="22" fill="var(--text-2)" fontSize="10">
              {`EAD ${keur(ead)}`}
            </text>
            <rect
              x="40"
              y="28"
              width={full}
              height="16"
              rx="3"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            <g opacity={s >= 1 ? 1 : 0.2}>
              <text x="40" y="62" fill="var(--text-2)" fontSize="10">
                {`× LGD ${pct(lgd)} = ${keur(loss)}`}
              </text>
              <rect
                x="40"
                y="68"
                width={wLoss}
                height="16"
                rx="3"
                fill="var(--accent)"
                opacity="0.45"
              />
            </g>
            <g opacity={s >= 2 ? 1 : 0.2}>
              <text x="40" y="102" fill="var(--text-2)" fontSize="10">
                {`× PD ${pct(pd)} = pérdida esperada ${keur(el)}`}
              </text>
              <rect x="40" y="108" width={wEl} height="16" rx="2" fill="var(--bear)" />
            </g>
            {s >= 3 ? (
              <text x="280" y="120" textAnchor="end" fill="var(--text)" fontSize="10">
                {'Inesperada → capital'}
              </text>
            ) : null}
            <text x="160" y="137" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              {'Cifras ficticias'}
            </text>
          </svg>
        );
      }}
    />
  );
}
