import { stepAt } from './Explainer';
import { taeFromTin } from '../../../engine/finance';
import { formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  /** TIN anual en % */
  tin: number;
  onInteract?: (id: string) => void;
}

const FREQUENCIES = [
  { n: 1, label: 'anual' },
  { n: 2, label: 'semestral' },
  { n: 4, label: 'trimestral' },
  { n: 12, label: 'mensual' },
];

/** El TIN es el mismo; la TAE sube cuanto más a menudo se liquidan los intereses. */
export function TinVsTae({ tin, onInteract }: Props) {
  const taes = FREQUENCIES.map((f) => taeFromTin(tin, f.n));
  const maxTae = taes[taes.length - 1]!;
  const steps: ExplainerStep[] = FREQUENCIES.map((f, i) => ({
    title: `Liquidación ${f.label}`,
    text:
      i === 0
        ? `Con un TIN del ${formatNumber(tin, 2)} % y una sola liquidación al año, la TAE es igual al TIN: ${formatNumber(taes[0]!, 2)} %.`
        : `Con liquidación ${f.label} (${f.n} veces al año) el TIN sigue siendo ${formatNumber(tin, 2)} %, pero la TAE sube a ${formatNumber(taes[i]!, 2)} %: los intereses ya cobrados generan intereses.`,
  }));
  return (
    <Explainer
      explainerId="TinVsTae"
      title="TIN y TAE"
      description={`Con un TIN del ${formatNumber(tin, 2)} %, la TAE es ${taes.map((t, i) => `${formatNumber(t, 2)} % con liquidación ${FREQUENCIES[i]!.label}`).join(', ')}.`}
      steps={steps}
      onInteract={onInteract}
      durationMs={5000}
      render={(t) => {
        const active = stepAt(t, FREQUENCIES.length);
        const scale = 110 / Math.max(maxTae, tin, 0.0001);
        return (
          <svg viewBox="0 0 320 180" className="h-auto w-full" role="presentation">
            <line
              x1="20"
              x2="310"
              y1={150 - tin * scale}
              y2={150 - tin * scale}
              stroke="var(--text-2)"
              strokeDasharray="4 4"
            />
            <text
              x="22"
              y={144 - tin * scale}
              fill="var(--text-2)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              TIN {formatNumber(tin, 2)} %
            </text>
            {FREQUENCIES.map((f, i) => {
              const h = taes[i]! * scale;
              const on = i <= active;
              return (
                <g key={f.n}>
                  <rect
                    x={30 + i * 70}
                    y={150 - h}
                    width="50"
                    height={h}
                    rx="4"
                    fill={on ? 'var(--brand)' : 'var(--surface-1)'}
                    stroke="var(--brand)"
                    opacity={on ? 1 : 0.5}
                  />
                  <text
                    x={55 + i * 70}
                    y={165}
                    textAnchor="middle"
                    fill="var(--text-2)"
                    fontSize="10"
                  >
                    {f.label}
                  </text>
                  {on && (
                    <text
                      x={55 + i * 70}
                      y={144 - h}
                      textAnchor="middle"
                      fill="var(--text)"
                      fontSize="11"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {formatNumber(taes[i]!, 2)} %
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        );
      }}
    />
  );
}
