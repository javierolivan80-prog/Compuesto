import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Capital inicial (€) y número de pérdidas seguidas. */
  capital: number;
  losses: number;
  onInteract?: (id: string) => void;
}

/** Porcentajes arriesgados por operación que se recorren paso a paso. */
const RISKS = [1, 2, 5, 10] as const;

const money = (v: number) => `${formatNumber(Math.round(v), 0)}\u00a0€`;
const pct = (v: number) => `${formatNumber(Math.round(v * 10) / 10, 1)}\u00a0%`;

/**
 * Tamaño de posición (ANIMACIONES §2, `PositionSizing`): la misma racha de pérdidas seguidas deja la cuenta casi
 * intacta si se arriesga poco por operación y la vacía si se arriesga mucho; y cuanto más cae, más cuesta recuperarla.
 */
export function PositionSizing({ capital, losses, onInteract }: Props) {
  const left = (r: number) => capital * (1 - r / 100) ** losses;
  const drop = (r: number) => (1 - left(r) / capital) * 100;
  const back = (r: number) => (capital / left(r) - 1) * 100;
  const steps: ExplainerStep[] = RISKS.map((r) => ({
    title: `${r} %`,
    text: `Arriesgando el ${r} % de lo que queda en cada operación, tras ${losses} pérdidas seguidas te quedan ${money(left(r))}: has perdido un ${pct(drop(r))} y necesitas ganar un ${pct(back(r))} para volver al principio.`,
  }));
  return (
    <Explainer
      explainerId="PositionSizing"
      title={t('positionSizing.title')}
      description={`Capital de ${money(capital)} y ${losses} pérdidas seguidas: arriesgando un 1 % por operación quedan ${money(left(1))}; un 2 %, ${money(left(2))}; un 5 %, ${money(left(5))}; un 10 %, ${money(left(10))}, y hace falta ganar un ${pct(back(10))} para recuperarlo.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, RISKS.length);
        const r = RISKS[s]!;
        const W = 260;
        return (
          <svg viewBox="0 0 320 90" className="h-auto w-full" role="presentation">
            <rect
              x="30"
              y="28"
              width={W}
              height="24"
              rx="3"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            <rect
              x="30"
              y="28"
              width={(W * left(r)) / capital}
              height="24"
              rx="3"
              fill={drop(r) < 20 ? 'var(--bull)' : 'var(--bear)'}
              opacity="0.5"
            />
            <text x="160" y="18" textAnchor="middle" fill="var(--text)" fontSize="11">
              {`${r} % · ${money(left(r))}`}
            </text>
            <text x="160" y="72" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              {`${t('positionSizing.recover')} ${pct(back(r))}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
