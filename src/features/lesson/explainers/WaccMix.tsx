import {
  costOfDebt,
  costOfEquity,
  leveredBeta,
  TAX,
  waccAt,
  type WaccSetup,
} from '../../../engine/games/wacc-mix';
import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Tipo sin riesgo, prima de mercado y prima por tamaño (%). */
  rf: number;
  erp: number;
  size: number;
  /** Beta desapalancada del negocio. */
  betaU: number;
  /** Coste de la deuda antes de impuestos con poca deuda (%) y peso de la deuda a partir del cual se encarece (%). */
  kd0: number;
  threshold: number;
  onInteract?: (id: string) => void;
}

/** Pesos de la deuda que recorre: sin deuda, la estructura objetivo (la del sector) de Naranjas, el mínimo y demasiada deuda. */
const WEIGHTS = [0, 20, 35, 60];
const pct = (v: number) => `${formatNumber(v, 2)}\u00a0%`;

/**
 * WACC (ANIMACIONES §2, `WaccMix`): dos barras, la del capital propio y la de la deuda después de impuestos, cuyo
 * ancho es su peso en la financiación y su alto su coste; el WACC es la altura media de las dos. Al subir la deuda,
 * pesa más la parte barata, pero el capital propio se encarece (beta apalancada) y, pasado un umbral, la deuda también.
 */
export function WaccMix({ rf, erp, size, betaU, kd0, threshold, onInteract }: Props) {
  const s: WaccSetup = { seed: -1, rf, erp, size, betaU, kd0, threshold };
  const rows = WEIGHTS.map((w) => ({
    w,
    beta: leveredBeta(s, w),
    ke: costOfEquity(s, w),
    kd: costOfDebt(s, w) * (1 - TAX),
    wacc: waccAt(s, w),
  }));
  const steps: ExplainerStep[] = rows.map((r, i) => ({
    title: r.w === 0 ? 'Sin deuda' : `Un ${r.w}\u00a0% de deuda`,
    text:
      i === 0
        ? `Todo es capital propio: beta ${formatNumber(r.beta, 2)}, coste del capital propio ${pct(r.ke)}, y el WACC es ese mismo ${pct(r.wacc)}.`
        : i === 3
          ? `Demasiada deuda: los bancos cobran un ${pct(costOfDebt(s, r.w))} antes de impuestos y el capital propio pide un ${pct(r.ke)}. El WACC sube a ${pct(r.wacc)}.`
          : `La deuda cuesta un ${pct(r.kd)} después de impuestos y pesa más; el capital propio sube a ${pct(r.ke)} (beta ${formatNumber(r.beta, 2)}). WACC: ${pct(r.wacc)}.`,
  }));
  const top = Math.max(...rows.map((r) => Math.max(r.ke, r.kd))) * 1.1;
  return (
    <Explainer
      explainerId="WaccMix"
      title={t('waccMix.title')}
      description={rows
        .map(
          (r) =>
            `Con un ${r.w} % de deuda, coste del capital propio ${pct(r.ke)}, deuda después de impuestos ${pct(r.kd)} y WACC ${pct(r.wacc)}.`,
        )
        .join(' ')}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const r = rows[stepAt(time, rows.length)]!;
        const base = 112;
        const left = 20;
        const width = 280;
        const h = (v: number) => (v / top) * 96;
        // el ancho de cada barra es su peso; el área, lo que aporta al WACC
        const we = (width * (100 - r.w)) / 100;
        const wd = (width * r.w) / 100;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="8" x2="312" y1={base} y2={base} stroke="var(--line)" />
            <rect
              x={left}
              y={base - h(r.ke)}
              width={we}
              height={h(r.ke)}
              fill="var(--brand)"
              opacity="0.85"
            />
            {r.w > 0 && (
              <rect
                x={left + we}
                y={base - h(r.kd)}
                width={wd}
                height={h(r.kd)}
                fill="var(--info)"
                opacity="0.85"
              />
            )}
            <line
              x1={left}
              x2={left + width}
              y1={base - h(r.wacc)}
              y2={base - h(r.wacc)}
              stroke="var(--accent)"
              strokeWidth="2.5"
            />
            <text
              x={left + width}
              y={base - h(r.wacc) - 4}
              textAnchor="end"
              fill="var(--text)"
              fontSize="10"
            >
              {`WACC ${pct(r.wacc)}`}
            </text>
            <text x={left + 4} y="128" fill="var(--text-2)" fontSize="10">
              {`Capital ${100 - r.w} % · ${pct(r.ke)}`}
            </text>
            {r.w > 0 && (
              <text x={left + width} y="128" textAnchor="end" fill="var(--text-2)" fontSize="10">
                {`Deuda ${r.w} % · ${pct(r.kd)}`}
              </text>
            )}
          </svg>
        );
      }}
    />
  );
}
