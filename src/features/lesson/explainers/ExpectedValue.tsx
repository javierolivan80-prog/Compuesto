import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Porcentaje de operaciones ganadoras y ganancia y pérdida medias (€). */
  winPct: number;
  avgWin: number;
  avgLoss: number;
  onInteract?: (id: string) => void;
}

const money = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}\u00a0€`;
const n0 = (v: number) => formatNumber(v);

/**
 * Valor esperado (ANIMACIONES §2, `ExpectedValue`): cada operación gana o pierde, pero la media de muchas se acerca al
 * valor esperado. La banda de ±2 errores típicos alrededor de la media (desviación típica / √n) se estrecha al crecer
 * el número de operaciones: es la ley de los grandes números.
 */
export function ExpectedValue({ winPct, avgWin, avgLoss, onInteract }: Props) {
  const p = winPct / 100;
  const ev = Math.round((p * avgWin - (1 - p) * avgLoss) * 100) / 100;
  const sd = Math.sqrt(p * (avgWin - ev) ** 2 + (1 - p) * (-avgLoss - ev) ** 2);
  const band = (n: number) => Math.round((2 * sd) / Math.sqrt(n));
  const sizes = [1, 10, 100, 1000];
  const steps: ExplainerStep[] = [
    {
      title: 'Una operación',
      text: `Cada operación gana ${money(avgWin)} el ${n0(winPct)} % de las veces. Una sola no dice nada: gana ${money(avgWin)} o pierde ${money(avgLoss)}, con una desviación típica de ${money(Math.round(sd))}.`,
    },
    {
      title: '10 operaciones',
      text: `Valor esperado: ${formatNumber(p, 2)} × ${money(avgWin)} − ${formatNumber(1 - p, 2)} × ${money(avgLoss)} = ${money(ev)}. Con 10 operaciones, la media aún puede estar a ±${money(band(10))} de ahí.`,
    },
    {
      title: '100 operaciones',
      text: `Con 100, la banda se estrecha a ±${money(band(100))}: el error de la media es la desviación típica entre la raíz del número de operaciones.`,
    },
    {
      title: '1.000 operaciones',
      text: `Con 1.000, ±${money(band(1000))}: la media se pega al valor esperado. Es la ley de los grandes números, y por eso una racha corta no prueba nada.`,
    },
  ];
  const lo = -avgLoss;
  const hi = avgWin;
  const x = (v: number) => 30 + ((v - lo) / (hi - lo)) * 260;
  return (
    <Explainer
      explainerId="ExpectedValue"
      title={t('expectedValue.title')}
      description={`Estrategia que gana ${money(avgWin)} el ${n0(winPct)} % de las veces y pierde ${money(avgLoss)} el resto: valor esperado de ${money(ev)} por operación. La media de 10 operaciones puede desviarse ±${money(band(10))}; la de 100, ±${money(band(100))}; la de 1.000, ±${money(band(1000))}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        // en el primer paso, una sola operación: se marca su desviación típica, no una banda de ±2σ
        const b = s === 0 ? Math.round(sd) : band(sizes[s]!);
        const left = Math.max(lo, ev - b);
        const right = Math.min(hi, ev + b);
        return (
          <svg viewBox="0 0 320 110" className="h-auto w-full" role="presentation">
            <line x1="30" y1="60" x2="290" y2="60" stroke="var(--line)" />
            <line
              x1={x(0)}
              y1="40"
              x2={x(0)}
              y2="80"
              stroke="var(--text-2)"
              strokeDasharray="3 3"
            />
            <rect
              x={x(left)}
              y="50"
              width={Math.max(2, x(right) - x(left))}
              height="20"
              rx="3"
              fill={ev >= 0 ? 'var(--bull)' : 'var(--bear)'}
              opacity="0.3"
            />
            <line x1={x(ev)} y1="44" x2={x(ev)} y2="76" stroke="var(--accent)" strokeWidth="2" />
            <text x="30" y="96" fill="var(--text-2)" fontSize="9">
              {money(lo)}
            </text>
            <text x="290" y="96" textAnchor="end" fill="var(--text-2)" fontSize="9">
              {money(hi)}
            </text>
            <text x="160" y="30" textAnchor="middle" fill="var(--text)" fontSize="11">
              {`${n0(sizes[s]!)} · ${money(ev)} ± ${money(b)}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
