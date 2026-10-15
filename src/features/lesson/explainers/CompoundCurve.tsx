import { compoundValueAt, simpleValue } from '../../../engine/finance';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  principal: number;
  /** % anual */
  rate: number;
  years: number;
  onInteract?: (id: string) => void;
}

const W = 320;
const H = 170;
const PAD = { l: 8, r: 8, t: 10, b: 16 };

/** Interés simple (recta) frente a interés compuesto (curva) con los valores de la lección. */
export function CompoundCurve({ principal, rate, years, onInteract }: Props) {
  const finalSimple = simpleValue(principal, rate, years);
  const finalCompound = compoundValueAt(principal, rate, years);
  const yMax = finalCompound * 1.05;
  const x = (y: number) => PAD.l + (y / years) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);

  const path = (f: (yr: number) => number, upTo: number) => {
    const pts: string[] = [];
    const n = Math.max(1, Math.ceil(upTo * 4));
    for (let i = 0; i <= n; i++) {
      const yr = Math.min(upTo, (i / n) * upTo);
      pts.push(`${i === 0 ? 'M' : 'L'}${x(yr).toFixed(1)} ${y(f(yr)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const steps: ExplainerStep[] = [
    {
      title: 'Capital inicial',
      text: `Partes de ${formatEur(principal, 0)} al ${formatNumber(rate, 1)} % anual.`,
    },
    {
      title: 'Interés simple',
      text: `Ganas lo mismo cada año: ${formatEur(simpleValue(principal, rate, 1) - principal, 0)}. Tras ${years} años: ${formatEur(finalSimple, 0)}.`,
    },
    {
      title: 'Interés compuesto',
      text: `Los intereses generan intereses y la curva se acelera. Tras ${years} años: ${formatEur(finalCompound, 0)}.`,
    },
    {
      title: 'La diferencia',
      text: `Con el mismo tipo y plazo, el compuesto da ${formatEur(finalCompound - finalSimple, 0)} más.`,
    },
  ];

  return (
    <Explainer
      explainerId="CompoundCurve"
      title="Interés simple frente a interés compuesto"
      description={`Gráfico: con ${formatEur(principal, 0)} al ${formatNumber(rate, 1)} % durante ${years} años, el interés simple llega a ${formatEur(finalSimple, 0)} en línea recta y el compuesto a ${formatEur(finalCompound, 0)} en una curva que se acelera.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const shown = t * years;
        return (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="presentation">
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(principal)}
              y2={y(principal)}
              stroke="var(--line)"
              strokeDasharray="3 3"
            />
            {shown > 0 && (
              <path
                d={path((yr) => simpleValue(principal, rate, yr), shown)}
                fill="none"
                stroke="var(--text-2)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            )}
            {shown > 0 && (
              <path
                d={path((yr) => compoundValueAt(principal, rate, yr), shown)}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2.5"
              />
            )}
            <circle
              cx={x(shown)}
              cy={y(compoundValueAt(principal, rate, shown))}
              r="4"
              fill="var(--brand)"
            />
            <text
              x={W - PAD.r}
              y={y(finalCompound) - 6}
              textAnchor="end"
              fill="var(--brand)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Compuesto
            </text>
            <text
              x={W - PAD.r}
              y={y(finalSimple) + 14}
              textAnchor="end"
              fill="var(--text-2)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Simple
            </text>
            <text
              x={PAD.l}
              y={H - 3}
              fill="var(--text-2)"
              fontSize="9"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              año {formatNumber(shown, 0)} · {formatEur(compoundValueAt(principal, rate, shown), 0)}
            </text>
          </svg>
        );
      }}
    />
  );
}
