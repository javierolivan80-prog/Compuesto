import { capWeightedIndex } from '../../../engine/finance';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  constituents: { name: string; cap: number; returnPct: number }[];
  onInteract?: (id: string) => void;
}

const sign = (n: number, d = 1) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(Math.abs(n), d)}`;

/** En un índice ponderado por capitalización, las empresas grandes pesan más y aportan más a su movimiento. */
export function IndexWeights({ constituents, onInteract }: Props) {
  const { rows, returnPct } = capWeightedIndex(constituents);
  const steps: ExplainerStep[] = [
    {
      title: 'El peso de cada empresa',
      text: `Cada una pesa lo que su capitalización respecto al total: ${rows.map((r) => `${r.name} ${formatNumber(r.weightPct, 0)} %`).join(', ')}.`,
    },
    {
      title: 'Lo que ha hecho cada una',
      text: `Rentabilidades: ${rows.map((r) => `${r.name} ${sign(r.returnPct, 1)} %`).join(', ')}.`,
    },
    {
      title: 'Su aportación al índice',
      text: `Aportación = peso × rentabilidad: ${rows.map((r) => `${r.name} ${sign(r.contributionPp, 2)} p. p.`).join(', ')}.`,
    },
    {
      title: 'La rentabilidad del índice',
      text: `La suma de las aportaciones da ${sign(returnPct, 2)} %: el índice se mueve más con las empresas grandes.`,
    },
  ];
  return (
    <Explainer
      explainerId="IndexWeights"
      title="Cómo se mueve un índice"
      description={`Índice ponderado por capitalización. ${rows.map((r) => `${r.name}: peso ${formatNumber(r.weightPct, 0)} %, rentabilidad ${sign(r.returnPct, 1)} %, aportación ${sign(r.contributionPp, 2)} p. p.`).join('; ')}. Rentabilidad del índice: ${sign(returnPct, 2)} %.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 4);
        const rowH = 28;
        return (
          <svg
            viewBox={`0 0 320 ${rows.length * rowH + 30}`}
            className="h-auto w-full"
            role="presentation"
          >
            {rows.map((r, i) => {
              const y = 10 + i * rowH;
              const w = (r.weightPct / 100) * 180;
              const contribW = Math.min(60, Math.abs(r.contributionPp) * 8);
              return (
                <g key={r.name}>
                  <text x="8" y={y + 15} fill="var(--text)" fontSize="11">
                    {r.name}
                  </text>
                  <rect
                    x="60"
                    y={y}
                    width={w}
                    height="18"
                    rx="3"
                    fill="var(--brand)"
                    opacity={0.85}
                  />
                  {s >= 2 && (
                    <rect
                      x={r.contributionPp >= 0 ? 250 : 250 - contribW}
                      y={y}
                      width={contribW}
                      height="18"
                      rx="3"
                      fill={r.contributionPp >= 0 ? 'var(--bull)' : 'var(--bear)'}
                    />
                  )}
                  {s >= 1 && (
                    <text
                      x={64 + w}
                      y={y + 14}
                      fill="var(--text-2)"
                      fontSize="10"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {sign(r.returnPct, 1)} %
                    </text>
                  )}
                </g>
              );
            })}
            {s >= 3 && (
              <text
                x="8"
                y={rows.length * rowH + 22}
                fill="var(--text)"
                fontSize="11"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                índice {sign(returnPct, 2)} %
              </text>
            )}
          </svg>
        );
      }}
    />
  );
}
