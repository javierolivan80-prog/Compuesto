import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Rentabilidad del activo antes de intereses en un año bueno y en uno malo (%). */
  goodRoa: number;
  badRoa: number;
  /** Tipo de interés de la deuda (%). */
  rate: number;
  onInteract?: (id: string) => void;
}

/** ROE (antes de impuestos) con una parte de deuda: (ROA − tipo × deuda/activo) / (patrimonio/activo). */
export const leveredRoe = (roa: number, rate: number, debtShare: number) =>
  (roa - rate * debtShare) / (1 - debtShare);

const pct = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}\u00a0%`;

/**
 * Apalancamiento financiero (ANIMACIONES §2, `Leverage`): el mismo negocio, con más o menos deuda. La deuda amplifica
 * el ROE hacia arriba en un año bueno y hacia abajo en uno malo.
 */
export function Leverage({ goodRoa, badRoa, rate, onInteract }: Props) {
  const shares = [0, 0.5, 0.75];
  const rows = shares.map((d) => ({
    d,
    good: leveredRoe(goodRoa, rate, d),
    bad: leveredRoe(badRoa, rate, d),
  }));
  const steps: ExplainerStep[] = rows.map((r) => ({
    title: r.d === 0 ? 'Sin deuda' : `Con un ${formatNumber(r.d * 100)}\u00a0% de deuda`,
    text:
      r.d === 0
        ? `Todo el activo lo pagan los accionistas: el ROE es la rentabilidad del activo, ${pct(r.good)} en un año bueno y ${pct(r.bad)} en uno malo.`
        : `La deuda cuesta un ${formatNumber(rate, 1)}\u00a0%. En un año bueno, lo que el activo gana de más se reparte entre menos patrimonio: ROE ${pct(r.good)}. En uno malo, los intereses se comen el resultado: ROE ${pct(r.bad)}.`,
  }));
  const max = Math.max(...rows.map((r) => Math.abs(r.good)), ...rows.map((r) => Math.abs(r.bad)));
  return (
    <Explainer
      explainerId="Leverage"
      title={t('leverage.title')}
      description={rows
        .map(
          (r) =>
            `Con un ${formatNumber(r.d * 100)} % de deuda, ROE ${pct(r.good)} en un año bueno y ${pct(r.bad)} en uno malo.`,
        )
        .join(' ')}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 3);
        const scale = 52 / max;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="10" x2="310" y1="70" y2="70" stroke="var(--line)" />
            {rows.map((r, i) => {
              const x = 30 + i * 100;
              const on = i <= s;
              const gh = Math.abs(r.good) * scale;
              const bh = Math.abs(r.bad) * scale;
              return (
                <g key={r.d} opacity={on ? 1 : 0.25}>
                  <rect x={x} y={70 - gh} width="28" height={gh} rx="3" fill="var(--bull)" />
                  <rect
                    x={x + 34}
                    y={r.bad >= 0 ? 70 - bh : 70}
                    width="28"
                    height={Math.max(bh, 1)}
                    rx="3"
                    fill="var(--bear)"
                  />
                  <text x={x + 31} y="134" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                    {`${formatNumber(r.d * 100)} % deuda`}
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
