import { doublingYearsExact, doublingYearsRule72 } from '../../../engine/finance';
import { formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  /** % anual */
  rate: number;
  onInteract?: (id: string) => void;
}

const DOUBLINGS = 3;

/** El capital se duplica cada 72 / tipo años: 1×, 2×, 4×, 8×. */
export function Rule72({ rate, onInteract }: Props) {
  const approx = doublingYearsRule72(rate);
  const exact = doublingYearsExact(rate);
  const totalYears = approx * DOUBLINGS;
  const steps: ExplainerStep[] = [
    {
      title: 'Punto de partida',
      text: `Con un ${formatNumber(rate, 1)} % anual, la regla del 72 dice que se duplica en 72 / ${formatNumber(rate, 1)} = ${formatNumber(approx, 1)} años.`,
    },
    {
      title: 'Primera duplicación',
      text: `A los ${formatNumber(approx, 1)} años el capital vale el doble (2×). El tiempo exacto es ${formatNumber(exact, 1)} años: la regla se queda muy cerca.`,
    },
    {
      title: 'Segunda duplicación',
      text: `A los ${formatNumber(approx * 2, 1)} años vale cuatro veces el capital inicial (4×).`,
    },
    {
      title: 'Tercera duplicación',
      text: `A los ${formatNumber(totalYears, 1)} años vale ocho veces el capital inicial (8×).`,
    },
  ];
  return (
    <Explainer
      explainerId="Rule72"
      title="La regla del 72"
      description={`Con un ${formatNumber(rate, 1)} % anual el capital se duplica cada ${formatNumber(approx, 1)} años aproximadamente (exacto: ${formatNumber(exact, 1)}): 2× a los ${formatNumber(approx, 1)} años, 4× a los ${formatNumber(approx * 2, 1)} y 8× a los ${formatNumber(totalYears, 1)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const yr = t * totalYears;
        const mult = Math.pow(2, yr / approx);
        const bars = [1, 2, 4, 8];
        return (
          <svg viewBox="0 0 320 170" className="h-auto w-full" role="presentation">
            {bars.map((m, i) => {
              const reached = mult >= m - 1e-9;
              const h = (m / 8) * 120;
              return (
                <g key={m}>
                  <rect
                    x={30 + i * 70}
                    y={140 - h}
                    width="50"
                    height={h}
                    rx="4"
                    fill={reached ? 'var(--brand)' : 'var(--surface-1)'}
                    stroke="var(--brand)"
                    strokeWidth="1"
                    opacity={reached ? 1 : 0.5}
                  />
                  <text
                    x={55 + i * 70}
                    y={155}
                    textAnchor="middle"
                    fill="var(--text-2)"
                    fontSize="10"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {m}× · {formatNumber(i * approx, 0)} a.
                  </text>
                </g>
              );
            })}
            <text
              x="8"
              y="14"
              fill="var(--text)"
              fontSize="11"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              año {formatNumber(yr, 0)} · {formatNumber(mult, 1)}×
            </text>
          </svg>
        );
      }}
    />
  );
}
