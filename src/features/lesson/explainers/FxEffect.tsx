import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** EUR/USD al comprar y subida del activo en dólares (%). */
  rate0: number;
  gain: number;
  onInteract?: (id: string) => void;
}

const pct = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}\u00a0%`;

/**
 * Efecto divisa (ANIMACIONES §2, `FxEffect`): la misma subida de un activo en dólares, vista en euros con distintos
 * EUR/USD un año después. Dos barras: la rentabilidad en dólares, fija, y la rentabilidad en euros, que cambia.
 */
export function FxEffect({ rate0, gain, onInteract }: Props) {
  const rates = [rate0 - 0.1, rate0, rate0 + 0.1, rate0 + 0.2].map(
    (r) => Math.round(r * 100) / 100,
  );
  const rows = rates.map((r) => ({ r, eur: (((1 + gain / 100) * rate0) / r) * 100 - 100 }));
  const steps: ExplainerStep[] = rows.map((x) => ({
    title: `EUR/USD a ${formatNumber(x.r, 2)}`,
    text:
      x.r === rate0
        ? `Si el tipo de cambio no se mueve, ganas en euros lo mismo que en dólares: ${pct(gain)}.`
        : x.r < rate0
          ? `El dólar se aprecia: cada dólar vale más euros, y ganas ${pct(x.eur)} en euros, más que el ${pct(gain)} en dólares.`
          : x.eur < 0
            ? `El euro se aprecia: tus dólares valen menos euros y en euros pierdes un ${formatNumber(-x.eur, 1)}\u00a0%.`
            : `El euro se aprecia: tus dólares valen menos euros, y en euros te queda ${pct(x.eur)}.`,
  }));
  const max = Math.max(...rows.map((x) => Math.abs(x.eur)), gain);
  return (
    <Explainer
      explainerId="FxEffect"
      title={t('fxEffect.title')}
      description={`Un activo en dólares sube un ${pct(gain)}. ${rows
        .map(
          (x) =>
            `Con el EUR/USD a ${formatNumber(x.r, 2)} un año después, en euros: ${pct(x.eur)}.`,
        )
        .join(' ')}`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const x = rows[stepAt(time, rows.length)]!;
        const h = (v: number) => (Math.abs(v) / max) * 50;
        const bar = (cx: number, v: number, label: string) => (
          <g>
            <rect
              x={cx - 30}
              y={v >= 0 ? 66 - h(v) : 66}
              width="60"
              height={Math.max(h(v), 1)}
              rx="3"
              fill={v >= 0 ? 'var(--bull)' : 'var(--bear)'}
            />
            <text
              x={cx}
              y={v >= 0 ? 66 - h(v) - 4 : 66 + h(v) + 12}
              textAnchor="middle"
              fill="var(--text)"
              fontSize="11"
            >
              {`${v >= 0 ? '▲' : '▼'} ${pct(v)}`}
            </text>
            <text x={cx} y="134" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {label}
            </text>
          </g>
        );
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="20" x2="300" y1="66" y2="66" stroke="var(--line)" />
            {bar(100, gain, 'En dólares')}
            {bar(220, x.eur, `En euros (EUR/USD ${formatNumber(x.r, 2)})`)}
          </svg>
        );
      }}
    />
  );
}
