import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Coste del capital (%). */
  ke: number;
  /** Crecimiento a largo plazo (%). */
  g: number;
  onInteract?: (id: string) => void;
}

/** Distancia (puntos) entre el ROTE alto o bajo del ejemplo y el Ke. */
const GAP = 4;

const pct = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 1)}\u00a0%`;
const mult = (v: number) => `${formatNumber(v, 2)}x`;

/**
 * Valorar bancos (ANIMACIONES §2, `BankMultiple`): la recta del P/VTC justificado = (ROTE − g) / (Ke − g). Cruza el
 * 1 cuando el ROTE iguala al Ke; por encima, el banco crea valor y merece cotizar sobre su valor tangible; por
 * debajo, lo destruye.
 */
export function BankMultiple({ ke, g, onInteract }: Props) {
  const j = (rote: number) => (rote - g) / (ke - g);
  const high = ke + GAP;
  const low = ke - GAP;
  const steps: ExplainerStep[] = [
    {
      title: 'ROTE = Ke',
      text: `Con un coste del capital del ${pct(ke)} y un crecimiento del ${pct(g)}, un banco que gana un ROTE del ${pct(ke)} vale justo su valor tangible: P/VTC justificado = 1.`,
    },
    {
      title: 'ROTE alto',
      text: `Con un ROTE del ${pct(high)}: (${pct(high)} − ${pct(g)}) / (${pct(ke)} − ${pct(g)}) = ${mult(j(high))}. Crea valor: merece cotizar por encima de su valor tangible.`,
    },
    {
      title: 'ROTE bajo',
      text: `Con un ROTE del ${pct(low)}: ${mult(j(low))}. Destruye valor: cada euro de capital tangible vale menos de un euro en bolsa.`,
    },
    {
      title: 'La trampa',
      text: `Un P/VTC de ${mult(j(low))} parece barato, pero es lo que vale un banco con ese ROTE. Barato es cotizar por debajo de su justificado, no por debajo de 1.`,
    },
  ];
  return (
    <Explainer
      explainerId="BankMultiple"
      title={t('bankMultiple.title')}
      description={`P/VTC justificado = (ROTE − g) / (Ke − g), con un Ke del ${pct(ke)} y un g del ${pct(g)}: vale 1 con un ROTE del ${pct(ke)}, ${mult(j(high))} con un ${pct(high)} y ${mult(j(low))} con un ${pct(low)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const maxRote = 20;
        const maxP = 2.5;
        const x = (rote: number) => 40 + (rote / maxRote) * 250;
        const y = (p: number) => 115 - (Math.max(0, Math.min(maxP, p)) / maxP) * 95;
        const from = Math.max(g, 0);
        const to = Math.min(maxRote, g + maxP * (ke - g));
        const point = (rote: number, on: boolean) =>
          on ? <circle cx={x(rote)} cy={y(j(rote))} r="4" fill="var(--accent)" /> : null;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="40" x2="290" y1="115" y2="115" stroke="var(--line)" />
            <line x1="40" x2="40" y1="20" y2="115" stroke="var(--line)" />
            <line
              x1="40"
              x2="290"
              y1={y(1)}
              y2={y(1)}
              stroke="var(--text-2)"
              strokeDasharray="4 3"
            />
            <text x="36" y={y(1) + 4} textAnchor="end" fill="var(--text-2)" fontSize="10">
              {'1x'}
            </text>
            <line
              x1={x(from)}
              y1={y(j(from))}
              x2={x(to)}
              y2={y(j(to))}
              stroke="var(--brand)"
              strokeWidth="2"
            />
            {point(ke, true)}
            {point(high, s >= 1)}
            {point(low, s >= 2)}
            <text x={x(ke)} y="130" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {`Ke ${pct(ke)}`}
            </text>
            <text x="290" y="130" textAnchor="end" fill="var(--text-2)" fontSize="10">
              {'ROTE →'}
            </text>
            <text x="44" y="18" fill="var(--text-2)" fontSize="10">
              {'P/VTC justificado'}
            </text>
          </svg>
        );
      }}
    />
  );
}
