import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Flujos de caja libres de los años 1 a 5 (miles de €). */
  fcff: number[];
  /** WACC y crecimiento a perpetuidad (%). */
  wacc: number;
  g: number;
  onInteract?: (id: string) => void;
}

const n = (v: number) => formatNumber(Math.round(v));

/**
 * Descuento de flujos (ANIMACIONES §2, `DcfTimeTravel`): los flujos futuros viajan hacia hoy y encogen según el WACC
 * (convención de mitad de año); el valor terminal es un bloque grande que también encoge, y todo se suma en el valor
 * de empresa.
 */
export function DcfTimeTravel({ fcff, wacc, g, onInteract }: Props) {
  const w = wacc / 100;
  const factors = fcff.map((_, i) => 1 / (1 + w) ** (i + 0.5));
  const pv = fcff.map((f, i) => f * factors[i]!);
  const sumPv = pv.reduce((a, b) => a + b, 0);
  const last = fcff[fcff.length - 1]!;
  const tv = (last * (1 + g / 100)) / (w - g / 100);
  const pvTv = tv * factors[factors.length - 1]!;
  const ev = sumPv + pvTv;
  const steps: ExplainerStep[] = [
    {
      title: 'Los flujos del plan',
      text: `Cinco años de flujo de caja libre, de ${n(fcff[0]!)} a ${n(last)} mil €. Un euro dentro de cinco años vale menos que uno hoy.`,
    },
    {
      title: 'Viajan hacia hoy',
      text: `Cada flujo se divide entre (1 + ${formatNumber(wacc, 2)} %) elevado a los años que faltan (a mitad de año): el del año 5 encoge hasta ${n(pv[pv.length - 1]!)}. Suman ${n(sumPv)} mil € de hoy.`,
    },
    {
      title: 'El valor terminal',
      text: `Después del año 5, Gordon: ${n(last)} × (1 + ${formatNumber(g, 1)} %) / (${formatNumber(wacc, 2)} % − ${formatNumber(g, 1)} %) = ${n(tv)} mil €. Descontado: ${n(pvTv)}.`,
    },
    {
      title: 'Valor de empresa',
      text: `${n(sumPv)} + ${n(pvTv)} = ${n(ev)} mil €. El valor terminal pesa un ${formatNumber((pvTv / ev) * 100, 0)} %: casi todo el valor depende de lo que pase después del plan.`,
    },
  ];
  const top = Math.max(tv, ev) * 1.05;
  const h = (v: number) => (v / top) * 96;
  return (
    <Explainer
      explainerId="DcfTimeTravel"
      title={t('dcfTimeTravel.title')}
      description={`Flujos de ${n(fcff[0]!)} a ${n(last)} mil € descontados al ${formatNumber(wacc, 2)} %: ${n(sumPv)} mil € de hoy. Valor terminal con g del ${formatNumber(g, 1)} %: ${n(tv)}, ${n(pvTv)} descontado. Valor de empresa: ${n(ev)} mil €, del que el valor terminal es un ${formatNumber((pvTv / ev) * 100, 0)} %.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        // dentro del paso 1, cuánto han encogido ya los flujos (0–1)
        const shrink = s === 0 ? 0 : s === 1 ? Math.min(1, (time * 4 - 1) * 1.5) : 1;
        const base = 112;
        return (
          <svg viewBox="0 0 320 132" className="h-auto w-full" role="presentation">
            <line x1="8" x2="312" y1={base} y2={base} stroke="var(--line)" />
            {fcff.map((f, i) => {
              const v = f + (pv[i]! - f) * shrink;
              return (
                <g key={i}>
                  <rect
                    x={12 + i * 30}
                    y={base - h(f)}
                    width="22"
                    height={h(f)}
                    rx="2"
                    fill="none"
                    stroke="var(--line)"
                    strokeDasharray="3 2"
                  />
                  <rect
                    x={12 + i * 30}
                    y={base - h(v)}
                    width="22"
                    height={Math.max(h(v), 1)}
                    rx="2"
                    fill="var(--brand)"
                  />
                  <text
                    x={23 + i * 30}
                    y="126"
                    textAnchor="middle"
                    fill="var(--text-2)"
                    fontSize="9"
                  >
                    {`Año ${i + 1}`}
                  </text>
                </g>
              );
            })}
            <g opacity={s >= 2 ? 1 : 0.15}>
              <rect
                x="168"
                y={base - h(tv)}
                width="54"
                height={h(tv)}
                rx="3"
                fill="none"
                stroke="var(--line)"
                strokeDasharray="3 2"
              />
              <rect
                x="168"
                y={base - h(pvTv)}
                width="54"
                height={h(pvTv)}
                rx="3"
                fill="var(--accent)"
              />
              <text x="195" y="126" textAnchor="middle" fill="var(--text-2)" fontSize="9">
                {'Terminal'}
              </text>
            </g>
            <g opacity={s >= 3 ? 1 : 0.15}>
              <rect
                x="242"
                y={base - h(ev)}
                width="64"
                height={h(sumPv)}
                rx="3"
                fill="var(--brand)"
              />
              <rect
                x="242"
                y={base - h(pvTv)}
                width="64"
                height={h(pvTv)}
                rx="3"
                fill="var(--accent)"
              />
              <text x="274" y="126" textAnchor="middle" fill="var(--text-2)" fontSize="9">
                {'EV'}
              </text>
            </g>
          </svg>
        );
      }}
    />
  );
}
