import { amortizationSchedule, monthlyPayment } from '../../../engine/finance';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  principal: number;
  /** TIN anual en % */
  rate: number;
  years: number;
  onInteract?: (id: string) => void;
}

/** Cada cuota se parte en intereses y capital; al avanzar el tiempo, el capital gana. */
export function LoanAmortization({ principal, rate, years, onInteract }: Props) {
  const rows = amortizationSchedule(principal, rate, years);
  const payment = monthlyPayment(principal, rate, years);
  const perYear = Array.from({ length: years }, (_, y) => {
    const slice = rows.slice(y * 12, y * 12 + 12);
    return {
      interest: slice.reduce((s, r) => s + r.interest, 0),
      capital: slice.reduce((s, r) => s + r.capital, 0),
    };
  });
  const maxYear = Math.max(...perYear.map((y) => y.interest + y.capital));
  const first = rows[0]!;
  const mid = rows[Math.floor(rows.length / 2)]!;
  const last = rows[rows.length - 1]!;
  const fmt = (n: number) => formatEur(n);
  const steps: ExplainerStep[] = [
    {
      title: 'La cuota es fija',
      text: `Pides ${fmt(principal)} al ${formatNumber(rate, 2)} % TIN a ${years} años: pagas ${fmt(payment)} cada mes.`,
    },
    {
      title: 'Al principio, casi todo son intereses',
      text: `La primera cuota se reparte en ${fmt(first.interest)} de intereses y ${fmt(first.capital)} de capital.`,
    },
    {
      title: 'A mitad del plazo se equilibra',
      text: `En la cuota ${mid.month}: ${fmt(mid.interest)} de intereses y ${fmt(mid.capital)} de capital.`,
    },
    {
      title: 'Al final, casi todo es capital',
      text: `En la última cuota solo ${fmt(last.interest)} son intereses y ${fmt(last.capital)} amortizan el préstamo.`,
    },
  ];
  const bw = 290 / years;
  return (
    <Explainer
      explainerId="LoanAmortization"
      title="Cuadro de amortización"
      description={`Préstamo de ${fmt(principal)} al ${formatNumber(rate, 2)} % a ${years} años, cuota de ${fmt(payment)}. La primera cuota lleva ${fmt(first.interest)} de intereses y ${fmt(first.capital)} de capital; la última, ${fmt(last.interest)} y ${fmt(last.capital)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const shown = Math.max(1, Math.round(t * years));
        return (
          <svg viewBox="0 0 320 180" className="h-auto w-full" role="presentation">
            {perYear.slice(0, shown).map((y, i) => {
              const hi = (y.interest / maxYear) * 120;
              const hc = (y.capital / maxYear) * 120;
              const x = 15 + i * bw;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={150 - hc}
                    width={Math.max(bw - 2, 1)}
                    height={hc}
                    fill="var(--bull)"
                  />
                  <rect
                    x={x}
                    y={150 - hc - hi}
                    width={Math.max(bw - 2, 1)}
                    height={hi}
                    fill="var(--bear)"
                  />
                </g>
              );
            })}
            <text x="15" y="168" fill="var(--text-2)" fontSize="10">
              rojo: intereses · verde: capital · año {shown} de {years}
            </text>
          </svg>
        );
      }}
    />
  );
}
