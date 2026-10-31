import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Valor de la cartera en su máximo (€). */
  peak: number;
  onInteract?: (id: string) => void;
}

/** Caídas desde el máximo que se recorren paso a paso (%). */
const DROPS = [10, 20, 30, 50] as const;

const money = (v: number) => `${formatNumber(Math.round(v), 0)}\u00a0€`;
const pct = (v: number) => `${formatNumber(Math.round(v * 10) / 10, 1)}\u00a0%`;

/**
 * Drawdown (explicador nuevo de N6): la cartera cae desde su máximo y, al lado, la subida que hace falta para volver a
 * él, que crece mucho más deprisa que la caída: 1 / (1 − caída) − 1.
 */
export function Drawdown({ peak, onInteract }: Props) {
  const back = (d: number) => (1 / (1 - d / 100) - 1) * 100;
  const steps: ExplainerStep[] = DROPS.map((d) => ({
    title: `−${d} %`,
    text: `Desde un máximo de ${money(peak)}, una caída del ${d} % deja ${money(peak * (1 - d / 100))}. Para volver al máximo hace falta subir un ${pct(back(d))}${d >= 50 ? ': perder la mitad obliga a duplicar.' : '.'}`,
  }));
  return (
    <Explainer
      explainerId="Drawdown"
      title={t('drawdown.title')}
      description={`Desde un máximo de ${money(peak)}: tras caer un 10 % hay que subir un ${pct(back(10))}; tras un 20 %, un ${pct(back(20))}; tras un 30 %, un ${pct(back(30))}; tras un 50 %, un ${pct(back(50))}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, DROPS.length);
        const d = DROPS[s]!;
        const H = 70;
        return (
          <svg viewBox="0 0 320 110" className="h-auto w-full" role="presentation">
            <rect
              x="60"
              y={15 + (H * d) / 100}
              width="60"
              height={H * (1 - d / 100)}
              fill="var(--bear)"
              opacity="0.45"
            />
            <rect x="60" y="15" width="60" height={H} fill="none" stroke="var(--line)" />
            <rect
              x="200"
              y={15 + H - Math.min(H, (H * back(d)) / 100)}
              width="60"
              height={Math.min(H, (H * back(d)) / 100)}
              fill="var(--bull)"
              opacity="0.45"
            />
            <text x="90" y="102" textAnchor="middle" fill="var(--text)" fontSize="10">
              {`${t('drawdown.drop')} −${d} %`}
            </text>
            <text x="230" y="102" textAnchor="middle" fill="var(--text)" fontSize="10">
              {`${t('drawdown.back')} +${pct(back(d))}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
