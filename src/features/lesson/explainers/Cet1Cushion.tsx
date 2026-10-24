import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Activos ponderados por riesgo (M€). */
  apr: number;
  /** Capital CET1 (M€). */
  cet1: number;
  onInteract?: (id: string) => void;
}

/** Pilar 1 de CET1 y colchón de conservación (% de los APR). */
const PILLAR1 = 4.5;
const CONSERVATION = 2.5;

const pct1 = (v: number) => `${formatNumber(v, 1)}\u00a0%`;
const meur = (v: number) => `${formatNumber(v)}\u00a0M€`;

/**
 * Solvencia (ANIMACIONES §2, `Cet1Cushion`): el ratio CET1 como una barra frente a las líneas del pilar 1 (4,5 %) y
 * del colchón de conservación (7 %). Lo que sobra por encima del 7 % es el colchón que puede absorber pérdidas antes
 * de que el supervisor limite los dividendos. Se supone que los APR no cambian.
 */
export function Cet1Cushion({ apr, cet1, onInteract }: Props) {
  const ratio = (cet1 / apr) * 100;
  const floor = PILLAR1 + CONSERVATION;
  const spare = cet1 - (apr * floor) / 100;
  const steps: ExplainerStep[] = [
    {
      title: 'El ratio',
      text: `Un banco ficticio tiene ${meur(cet1)} de capital CET1 y ${meur(apr)} de activos ponderados por riesgo: ratio CET1 = ${pct1(ratio)}.`,
    },
    {
      title: 'Pilar 1',
      text: `Basilea III exige como mínimo un ${pct1(PILLAR1)} de CET1 sobre los APR a cualquier banco.`,
    },
    {
      title: 'Colchón',
      text: `Encima va el colchón de conservación, del ${pct1(CONSERVATION)}: el ${pct1(floor)} en total. El pilar 2 y otros colchones lo suben más, según el banco.`,
    },
    {
      title: 'Lo que aguanta',
      text: `Con los APR quietos, el banco podría perder ${meur(spare)} antes de bajar del ${pct1(floor)}. Si entra en el colchón, se le limitan los dividendos y los bonus.`,
    },
  ];
  return (
    <Explainer
      explainerId="Cet1Cushion"
      title={t('cet1Cushion.title')}
      description={`Ratio CET1 del ${pct1(ratio)} (${meur(cet1)} sobre ${meur(apr)} de APR) frente al mínimo del ${pct1(PILLAR1)} y el ${pct1(floor)} con el colchón de conservación: puede perder ${meur(spare)} antes de bajar de ese ${pct1(floor)}, con los APR quietos.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const top = Math.max(ratio + 3, 10);
        // eje: 0 % abajo (y = 120), `top` arriba (y = 20)
        const y = (v: number) => 120 - (v / top) * 100;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="40" x2="290" y1="120" y2="120" stroke="var(--line)" />
            <rect
              x="120"
              y={y(ratio)}
              width="70"
              height={120 - y(ratio)}
              rx="4"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            {s >= 3 ? (
              <rect
                x="120"
                y={y(ratio)}
                width="70"
                height={y(floor) - y(ratio)}
                fill="var(--accent)"
                opacity="0.5"
              />
            ) : null}
            <text x="155" y={y(ratio) - 6} textAnchor="middle" fill="var(--text)" fontSize="11">
              {pct1(ratio)}
            </text>
            <g opacity={s >= 1 ? 1 : 0.2}>
              <line
                x1="100"
                x2="210"
                y1={y(PILLAR1)}
                y2={y(PILLAR1)}
                stroke="var(--bear)"
                strokeDasharray="4 3"
              />
              <text x="215" y={y(PILLAR1) + 4} fill="var(--text-2)" fontSize="10">
                {`Pilar 1 ${pct1(PILLAR1)}`}
              </text>
            </g>
            <g opacity={s >= 2 ? 1 : 0.2}>
              <line
                x1="100"
                x2="210"
                y1={y(floor)}
                y2={y(floor)}
                stroke="var(--text-2)"
                strokeDasharray="4 3"
              />
              <text x="215" y={y(floor) + 4} fill="var(--text-2)" fontSize="10">
                {`+ colchón ${pct1(floor)}`}
              </text>
            </g>
            {s >= 3 ? (
              <text
                x="60"
                y={(y(ratio) + y(floor)) / 2 + 4}
                textAnchor="middle"
                fill="var(--text)"
                fontSize="10"
              >
                {`${meur(spare)}`}
              </text>
            ) : null}
            <text x="155" y="134" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {'CET1 / APR · cifras ficticias'}
            </text>
          </svg>
        );
      }}
    />
  );
}
