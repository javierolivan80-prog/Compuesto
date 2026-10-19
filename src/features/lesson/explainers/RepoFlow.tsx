import { t } from '../../../i18n';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Valor de los bonos (€), recorte (%), tipo anual (%) y días. */
  collateral: number;
  haircut: number;
  rate: number;
  days: number;
  onInteract?: (id: string) => void;
}

const eur = (v: number) => formatEur(Math.round(v), 0);
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;

/**
 * Repo (ANIMACIONES §2, `RepoFlow`): hoy, los bonos van al prestamista y el dinero al prestatario; al vencer, el dinero
 * vuelve con intereses y los bonos regresan. Es un préstamo con garantía disfrazado de compraventa.
 */
export function RepoFlow({ collateral, haircut, rate, days, onInteract }: Props) {
  const loan = collateral * (1 - haircut / 100);
  const interest = (loan * rate * days) / 100 / 360;
  const steps: ExplainerStep[] = [
    {
      title: 'Hoy: los bonos',
      text: `El banco que necesita dinero entrega ${eur(collateral)} en bonos del Estado como garantía.`,
    },
    {
      title: 'Hoy: el dinero',
      text: `A cambio recibe ${eur(loan)}: el valor de los bonos menos un recorte del ${pct(haircut, 0)}.`,
    },
    {
      title: 'Al vencer: devuelve',
      text: `${days === 1 ? 'Al día siguiente' : `A los ${days} días`} devuelve ${eur(loan + interest)}: lo prestado más ${eur(interest)} de intereses (${eur(loan)} × ${pct(rate)} × ${days} / 360).`,
    },
    {
      title: 'Al vencer: recupera',
      text: 'Y recupera sus bonos. Si no pagara, el prestamista se quedaría con ellos: por eso el repo es barato, porque el que presta corre poco riesgo.',
    },
  ];
  return (
    <Explainer
      explainerId="RepoFlow"
      title={t('repoFlow.title')}
      description={`Repo: se entregan ${eur(collateral)} en bonos y se reciben ${eur(loan)}; al vencer se devuelven ${eur(loan + interest)} y se recuperan los bonos.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const back = s >= 2;
        const arrow = (y: number, toRight: boolean, label: string, on: boolean, color: string) => (
          <g opacity={on ? 1 : 0.15}>
            <line
              x1={toRight ? 92 : 228}
              x2={toRight ? 222 : 98}
              y1={y}
              y2={y}
              stroke={color}
              strokeWidth="2.5"
            />
            <polygon
              points={
                toRight ? `228,${y} 218,${y - 5} 218,${y + 5}` : `92,${y} 102,${y - 5} 102,${y + 5}`
              }
              fill={color}
            />
            <text x="160" y={y - 6} textAnchor="middle" fill="var(--text)" fontSize="10">
              {label}
            </text>
          </g>
        );
        return (
          <svg viewBox="0 0 320 132" className="h-auto w-full" role="presentation">
            <rect
              x="8"
              y="30"
              width="80"
              height="72"
              rx="8"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            <text x="48" y="70" textAnchor="middle" fill="var(--text)" fontSize="10">
              {'Pide dinero'}
            </text>
            <rect
              x="232"
              y="30"
              width="80"
              height="72"
              rx="8"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            <text x="272" y="70" textAnchor="middle" fill="var(--text)" fontSize="10">
              {'Presta'}
            </text>
            {arrow(
              48,
              true,
              back ? 'Dinero + intereses' : 'Bonos',
              back ? s >= 2 : s >= 0,
              back ? 'var(--accent)' : 'var(--info)',
            )}
            {arrow(
              92,
              false,
              back ? 'Bonos' : 'Dinero',
              back ? s >= 3 : s >= 1,
              back ? 'var(--info)' : 'var(--accent)',
            )}
            <text x="160" y="126" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {back ? 'Al vencer' : 'Hoy'}
            </text>
          </svg>
        );
      }}
    />
  );
}
