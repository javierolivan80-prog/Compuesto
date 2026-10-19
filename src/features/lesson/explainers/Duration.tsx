import { price } from '../../../engine/games/bond-issue';
import { modifiedDuration } from '../../../engine/games/yield-curve';
import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Rentabilidad de hoy (%) de todos los bonos, que pagan ese mismo cupón y valen 100. */
  yield: number;
  /** Subida de la rentabilidad (puntos). */
  shock: number;
  onInteract?: (id: string) => void;
}

const PLAZOS = [2, 5, 10, 30];
/** «1 punto», «0,5 puntos»: sin decimales si es entero. */
const pts = (v: number) =>
  `${formatNumber(v, Number.isInteger(v) ? 0 : 2)} ${v === 1 ? 'punto' : 'puntos'}`;
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;

/**
 * Duración (ANIMACIONES §2, `Duration`): cuatro bonos de distinto plazo ante la misma subida de tipos; las barras de
 * su caída crecen con el plazo, y la duración modificada anticipa cuánto.
 */
export function Duration({ yield: y, shock, onInteract }: Props) {
  const rows = PLAZOS.map((n) => ({
    n,
    d: modifiedDuration(y, y, n),
    fall: 100 - price(y, y + shock, n),
  }));
  const steps: ExplainerStep[] = rows.map((r) => ({
    title: `Bono a ${r.n} años`,
    text: `Con ${pts(shock)} más cae un ${pct(r.fall)}. La duración modificada (${formatNumber(r.d, 2)}) anticipaba un ${pct(r.d * shock)}: cae algo menos por la convexidad, y la diferencia crece con el plazo.`,
  }));
  const max = Math.max(...rows.map((r) => r.fall));
  return (
    <Explainer
      explainerId="Duration"
      title={t('duration.title')}
      description={rows
        .map(
          (r) =>
            `El bono a ${r.n} años cae un ${pct(r.fall)} con ${pts(shock)} más; duración modificada ${formatNumber(r.d, 2)}.`,
        )
        .join(' ')}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, rows.length);
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="10" x2="310" y1="20" y2="20" stroke="var(--line)" />
            {rows.map((r, i) => {
              const x = 24 + i * 74;
              const h = (r.fall / max) * 92;
              return (
                <g key={r.n} opacity={i <= s ? 1 : 0.2}>
                  <rect x={x} y="20" width="48" height={Math.max(h, 1)} rx="3" fill="var(--bear)" />
                  <text
                    x={x + 24}
                    y={Math.min(132, 20 + h + 12)}
                    textAnchor="middle"
                    fill="var(--text)"
                    fontSize="10"
                  >
                    {`▼ ${pct(r.fall)}`}
                  </text>
                  <text x={x + 24} y="14" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                    {`${r.n} años`}
                  </text>
                </g>
              );
            })}
          </svg>
        );
      }}
    />
  );
}
