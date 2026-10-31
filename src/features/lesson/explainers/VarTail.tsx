import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Valor de la cartera (€) y volatilidad diaria (%). */
  value: number;
  sigma: number;
  onInteract?: (id: string) => void;
}

/** Pasos: VaR al 95 %, al 99 % y, al 99 %, con las colas gordas de los datos reales. */
const STEPS = [
  { conf: 95, z: 1.645, fat: false },
  { conf: 99, z: 2.33, fat: false },
  { conf: 99, z: 2.33, fat: true },
] as const;

const r2 = (x: number) => Math.round(x * 100) / 100;
const pct = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0%`;
const money = (v: number) => `${formatNumber(Math.round(v), 0)}\u00a0€`;
/** Densidad de la normal estándar. */
const phi = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

/**
 * VaR y CVaR (ANIMACIONES §2, `VarTail`): histograma de rentabilidades diarias con la cola de pérdidas sombreada a partir
 * del VaR (z × σ) y la marca del CVaR, la media de la cola (con la normal, σ × φ(z) / (1 − confianza)). El último paso
 * engorda la cola, como en los datos reales: el VaR normal no cambia, pero la cola pesa más.
 */
export function VarTail({ value, sigma, onInteract }: Props) {
  const varPct = (z: number) => r2(z * sigma);
  const cvarPct = (z: number, conf: number) => r2((sigma * phi(z)) / (1 - conf / 100));
  const fig = (conf: number, z: number) =>
    `al ${conf} %, VaR del ${pct(varPct(z))} (${money((varPct(z) / 100) * value)}) y CVaR del ${pct(cvarPct(z, conf))} (${money((cvarPct(z, conf) / 100) * value)})`;
  const steps: ExplainerStep[] = STEPS.map(({ conf, z, fat }) => ({
    title: fat ? t('varTail.fat') : t('varTail.conf', { conf }),
    text: fat
      ? `En los datos reales, la cola de pérdidas pesa más que en la campana: hay más días extremos. El VaR normal sigue en el ${pct(varPct(z))}, pero lo superan más días y por más: el CVaR real queda por encima del ${pct(cvarPct(z, conf))} normal.`
      : `Con ${pct(sigma)} de volatilidad diaria y una cartera de ${money(value)}: ${fig(conf, z)}. El VaR marca dónde empieza la cola; el CVaR, cuánto pesa de media.`,
  }));
  // Histograma de −4σ a +4σ en 32 barras (unidades de σ).
  const bins = Array.from({ length: 32 }, (_, i) => -4 + i * 0.25);
  const x = (u: number) => 20 + ((u + 4) / 8) * 280;
  const h = (u: number) => phi(u + 0.125) * 230;
  return (
    <Explainer
      explainerId="VarTail"
      title={t('varTail.title')}
      description={`Rentabilidades diarias de una cartera de ${money(value)} con un ${pct(sigma)} de volatilidad: ${fig(95, 1.645)}; ${fig(99, 2.33)}. Con colas gordas, la cola pesa más que en la normal.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const { z, conf, fat } = STEPS[stepAt(time, STEPS.length)]!;
        const cz = cvarPct(z, conf) / sigma;
        return (
          <svg viewBox="0 0 320 125" className="h-auto w-full" role="presentation">
            <line x1="20" y1="105" x2="300" y2="105" stroke="var(--line)" />
            {bins.map((u) => {
              const tail = u + 0.25 <= -z + 0.13;
              const extra = fat && Math.abs(u + 0.125) > 2 ? 6 : 0;
              const height = h(u) + extra;
              return (
                <rect
                  key={u}
                  x={x(u) + 0.5}
                  y={105 - height}
                  width={280 / 32 - 1}
                  height={height}
                  fill={tail ? 'var(--bear)' : 'var(--surface-2)'}
                  stroke="var(--line)"
                  strokeWidth="0.5"
                />
              );
            })}
            <line x1={x(-z)} y1="18" x2={x(-z)} y2="105" stroke="var(--text)" />
            <line
              x1={x(-cz)}
              y1="30"
              x2={x(-cz)}
              y2="105"
              stroke="var(--accent)"
              strokeDasharray="3 2"
            />
            <text x={x(-z) + 3} y="24" fill="var(--text)" fontSize="9">
              {`${t('varTail.var')} −${pct(varPct(z))}`}
            </text>
            <text x={x(-cz) - 3} y="36" textAnchor="end" fill="var(--text)" fontSize="9">
              {`${t('varTail.cvar')}${fat ? ' >' : ''} −${pct(cvarPct(z, conf))}`}
            </text>
            <text x="160" y="120" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              {fat ? t('varTail.fat') : t('varTail.conf', { conf })}
            </text>
          </svg>
        );
      }}
    />
  );
}
