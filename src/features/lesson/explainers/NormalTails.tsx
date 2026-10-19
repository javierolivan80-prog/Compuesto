import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Media y desviación típica de las rentabilidades mensuales (%). */
  mean: number;
  sd: number;
  onInteract?: (id: string) => void;
}

const pct = (v: number) => `${formatNumber(v, 1)}\u00a0%`;
const normal = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
/** Una t de Student con 3 grados de libertad, reescalada: más pico y colas más gordas que la normal. */
const fat = (z: number) => {
  const nu = 3;
  const k = 0.3675525969478614; // Γ(2) / (√(3π) Γ(1,5))
  const s = Math.sqrt(nu / (nu - 2));
  return k * s * (1 + (z * s) ** 2 / nu) ** (-(nu + 1) / 2);
};

/**
 * Distribución normal y colas gordas (ANIMACIONES §2, `NormalTails`): la campana con la media y una y dos desviaciones
 * típicas, y encima la forma de los datos reales: más meses tranquilos y más meses extremos.
 */
export function NormalTails({ mean, sd, onInteract }: Props) {
  const steps: ExplainerStep[] = [
    {
      title: 'La media',
      text: `De media, un ${pct(mean)} al mes. Cada mes se aleja algo: eso es la volatilidad.`,
    },
    {
      title: 'Una desviación típica',
      text: `Si fuera normal, unos 2 de cada 3 meses (68 %) estarían entre ${pct(mean - sd)} y ${pct(mean + sd)}.`,
    },
    {
      title: 'Dos desviaciones',
      text: `Y unos 95 de cada 100 entre ${pct(mean - 2 * sd)} y ${pct(mean + 2 * sd)}. Por debajo quedarían unos 2–3 meses de cada 100.`,
    },
    {
      title: 'Colas gordas',
      text: `Con la misma volatilidad, los mercados tienen más meses tranquilos y más meses extremos: la curva roja tiene más pico y colas más gordas. Una caída de más de tres desviaciones (por debajo de ${pct(mean - 3 * sd)}) pasa unas cinco veces más que en la normal.`,
    },
  ];
  const zs = Array.from({ length: 121 }, (_, i) => -4 + i / 15);
  const x = (z: number) => 20 + ((z + 4) / 8) * 280;
  // escala por el pico de la t3 reescalada (≈ 0,64), más alto que el de la normal (≈ 0,40)
  const y = (d: number) => 108 - (d / 0.66) * 96;
  const line = (f: (z: number) => number) => zs.map((z) => `${x(z)},${y(f(z))}`).join(' ');
  return (
    <Explainer
      explainerId="NormalTails"
      title={t('normalTails.title')}
      description={`Media de ${pct(mean)} al mes y desviación típica de ${pct(sd)}: con una normal, el 68 % de los meses entre ${pct(mean - sd)} y ${pct(mean + sd)} y el 95 % entre ${pct(mean - 2 * sd)} y ${pct(mean + 2 * sd)}. Los mercados reales tienen más meses tranquilos y más meses extremos, más allá de tres desviaciones.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const band = (k: number, fill: string) => (
          <rect x={x(-k)} y="12" width={x(k) - x(-k)} height="96" fill={fill} opacity="0.18" />
        );
        return (
          <svg viewBox="0 0 320 132" className="h-auto w-full" role="presentation">
            {s >= 2 && band(2, 'var(--info)')}
            {s >= 1 && band(1, 'var(--brand)')}
            <line x1="16" x2="304" y1="108" y2="108" stroke="var(--line)" />
            <polyline points={line(normal)} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
            {s >= 3 && (
              <polyline
                points={line(fat)}
                fill="none"
                stroke="var(--bear)"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
            )}
            <line x1={x(0)} x2={x(0)} y1="12" y2="108" stroke="var(--accent)" strokeWidth="2" />
            {[-3, -2, 0, 2, 3].map((k) => (
              <text key={k} x={x(k)} y="124" textAnchor="middle" fill="var(--text-2)" fontSize="9">
                {pct(mean + k * sd)}
              </text>
            ))}
          </svg>
        );
      }}
    />
  );
}
