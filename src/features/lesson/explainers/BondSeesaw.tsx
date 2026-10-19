import { price } from '../../../engine/games/bond-issue';
import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Cupón anual (%) y años que le quedan al bono. */
  coupon: number;
  years: number;
  onInteract?: (id: string) => void;
}

const pct = (v: number) => `${formatNumber(v, 1)}\u00a0%`;
const px = (v: number) => formatNumber(v, 2);

/**
 * Precio y tipos (ANIMACIONES §2, `BondSeesaw`): un balancín con el tipo de mercado a la izquierda y el precio del
 * bono a la derecha. Cuando sube el tipo, baja el precio; a la par cuando el tipo es igual al cupón.
 */
export function BondSeesaw({ coupon, years, onInteract }: Props) {
  const yields = [coupon - 1, coupon, coupon + 1, coupon + 2];
  const rows = yields.map((y) => ({ y, p: price(coupon, y, years) }));
  const steps: ExplainerStep[] = rows.map((r) => ({
    title: `Tipo de mercado: ${pct(r.y)}`,
    text:
      r.y === coupon
        ? `El mercado pide lo mismo que paga el cupón (${pct(coupon)}): el bono vale 100, a la par.`
        : r.y < coupon
          ? `Los bonos nuevos pagan menos que tu cupón del ${pct(coupon)}: el tuyo vale más, ${px(r.p)} por cada 100.`
          : `Los bonos nuevos pagan un ${pct(r.y)}, más que tu cupón: para que alguien compre el tuyo, su precio baja a ${px(r.p)}.`,
  }));
  return (
    <Explainer
      explainerId="BondSeesaw"
      title={t('bondSeesaw.title')}
      description={rows
        .map(
          (r) =>
            `Con el tipo de mercado al ${pct(r.y)}, un bono a ${years} años con cupón del ${pct(coupon)} vale ${px(r.p)}.`,
        )
        .join(' ')}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const r = rows[stepAt(time, rows.length)]!;
        // el balancín gira según lo lejos que está el precio de la par (tope de ±14°)
        const angle = Math.max(-14, Math.min(14, (100 - r.p) * 1.4));
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <polygon points="160,104 146,128 174,128" fill="var(--text-2)" />
            <g
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: '160px 100px',
                transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <rect x="30" y="96" width="260" height="8" rx="4" fill="var(--brand)" />
              <rect
                x="34"
                y="62"
                width="76"
                height="34"
                rx="6"
                fill="var(--surface-2)"
                stroke="var(--info)"
                strokeWidth="2"
              />
              <text x="72" y="84" textAnchor="middle" fill="var(--text)" fontSize="13">
                {`Tipo ${pct(r.y)}`}
              </text>
              <rect
                x="210"
                y="62"
                width="76"
                height="34"
                rx="6"
                fill="var(--surface-2)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              <text x="248" y="84" textAnchor="middle" fill="var(--text)" fontSize="13">
                {`Precio ${px(r.p)}`}
              </text>
            </g>
            <text x="160" y="22" textAnchor="middle" fill="var(--text-2)" fontSize="11">
              {`Cupón ${pct(coupon)} · ${years} años`}
            </text>
          </svg>
        );
      }}
    />
  );
}
