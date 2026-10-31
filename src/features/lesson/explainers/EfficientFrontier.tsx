import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Rentabilidad esperada y volatilidad de los dos activos (%). */
  rA: number;
  sA: number;
  rB: number;
  sB: number;
  onInteract?: (id: string) => void;
}

/** Correlaciones que se recorren paso a paso. */
const RHOS = [1, 0.5, 0, -0.5] as const;

const pct = (v: number) => `${formatNumber(Math.round(v * 10) / 10, 1)}\u00a0%`;
const corr = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 1)}`;

/**
 * Frontera de dos activos (ANIMACIONES §2, `EfficientFrontier`, en su versión de dos activos): las combinaciones de A y B
 * forman una curva en el plano volatilidad-rentabilidad que se dobla hacia la izquierda al bajar la correlación. Se
 * marca la cartera de mínima varianza.
 */
export function EfficientFrontier({ rA, sA, rB, sB, onInteract }: Props) {
  const vol = (w: number, r: number) =>
    Math.sqrt(w * w * sA * sA + (1 - w) ** 2 * sB * sB + 2 * w * (1 - w) * r * sA * sB);
  const minW = (r: number) => {
    const c = r * sA * sB;
    const w = (sB * sB - c) / (sA * sA + sB * sB - 2 * c);
    return Math.min(1, Math.max(0, w));
  };
  const steps: ExplainerStep[] = RHOS.map((r) => {
    const w = minW(r);
    return {
      title: `ρ = ${corr(r)}`,
      text:
        r === 1
          ? `Con correlación 1, mezclar no reduce el riesgo: la frontera es una recta entre B (${pct(sB)}) y A (${pct(sA)}).`
          : w === 0
            ? `Con correlación ${corr(r)}, la curva ya se dobla, pero A es tan volátil que la cartera de mínima varianza sigue siendo B sola, con un ${pct(sB)}.`
            : `Con correlación ${corr(r)}, la curva se dobla más: la cartera de mínima varianza, con un ${pct(w * 100)} en A, tiene una volatilidad del ${pct(vol(w, r))}, menos que B sola.`,
    };
  });
  const maxS = Math.max(sA, sB) * 1.1;
  const minR = Math.min(rA, rB) * 0.8;
  const maxR = Math.max(rA, rB) * 1.1;
  const x = (s: number) => 30 + (s / maxS) * 270;
  const y = (r: number) => 110 - ((r - minR) / (maxR - minR)) * 95;
  return (
    <Explainer
      explainerId="EfficientFrontier"
      title={t('efficientFrontier.title')}
      description={`Dos activos: A rinde un ${pct(rA)} con un ${pct(sA)} de volatilidad y B, un ${pct(rB)} con un ${pct(sB)}. Volatilidad de la cartera de mínima varianza según la correlación: ${RHOS.map((r) => `${corr(r)}, ${pct(vol(minW(r), r))}`).join('; ')}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, RHOS.length);
        const r = RHOS[s]!;
        const pts = Array.from({ length: 41 }, (_, i) => {
          const w = i / 40;
          return `${x(vol(w, r))},${y(w * rA + (1 - w) * rB)}`;
        }).join(' ');
        const w = minW(r);
        return (
          <svg viewBox="0 0 320 125" className="h-auto w-full" role="presentation">
            <line x1="30" y1="112" x2="300" y2="112" stroke="var(--line)" />
            <line x1="30" y1="10" x2="30" y2="112" stroke="var(--line)" />
            <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" />
            <circle cx={x(sA)} cy={y(rA)} r="4" fill="var(--brand)" />
            <circle cx={x(sB)} cy={y(rB)} r="4" fill="var(--brand)" />
            <text x={x(sA) - 8} y={y(rA) - 6} fill="var(--text)" fontSize="10">
              A
            </text>
            <text x={x(sB) + 6} y={y(rB) + 3} fill="var(--text)" fontSize="10">
              B
            </text>
            <circle cx={x(vol(w, r))} cy={y(w * rA + (1 - w) * rB)} r="4" fill="var(--bull)" />
            <text x="160" y="123" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              {`ρ = ${corr(r)} · ${t('efficientFrontier.minVar')} ${pct(vol(w, r))}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
