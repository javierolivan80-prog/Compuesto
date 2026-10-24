import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** EUR/USD de contado (dólares por euro). */
  spot: number;
  /** Tipos de interés a un año del euro y del dólar (%). */
  iEur: number;
  iUsd: number;
  onInteract?: (id: string) => void;
}

/** Importe del ejemplo (€). */
const AMOUNT = 1000;

/** Sin ceros sobrantes: 2 %, 2,5 %. */
const num = (v: number) =>
  formatNumber(v, Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2);
const pct = (v: number) => `${num(v)}\u00a0%`;
const fx4 = (v: number) => formatNumber(v, 4);

/**
 * Paridad de tipos de interés (ANIMACIONES §2, `FxParity`): dos divisas en un balancín con los tipos de interés como
 * pesos. Invertir en euros o pasar a dólares, invertir allí y fijar hoy el cambio de vuelta tiene que dar lo mismo:
 * de ahí sale el forward. La divisa de tipos más altos pesa más y cotiza más barata a plazo.
 */
export function FxParity({ spot, iEur, iUsd, onInteract }: Props) {
  const fwd = Math.round(((spot * (1 + iUsd / 100)) / (1 + iEur / 100)) * 10_000) / 10_000;
  const eurEnd = AMOUNT * (1 + iEur / 100);
  const usdStart = AMOUNT * spot;
  const usdEnd = usdStart * (1 + iUsd / 100);
  const usdHigher = iUsd > iEur;
  const steps: ExplainerStep[] = [
    {
      title: 'En euros',
      text: `Inviertes ${formatNumber(AMOUNT)} € a un año al ${pct(iEur)}: tendrás ${formatNumber(eurEnd, 2)} €.`,
    },
    {
      title: 'En dólares',
      text: `O los cambias al EUR/USD de ${fx4(spot)} (${formatNumber(usdStart, 2)} $) y los inviertes al ${pct(iUsd)}: tendrás ${formatNumber(usdEnd, 2)} $.`,
    },
    {
      title: 'Sin ganancia gratis',
      text: `Si fijas hoy el cambio de vuelta, las dos vías tienen que valer lo mismo: forward = ${fx4(spot)} × (1 + ${pct(iUsd)}) / (1 + ${pct(iEur)}) = ${fx4(fwd)} dólares por euro.`,
    },
    {
      title: 'A plazo',
      text: usdHigher
        ? `El dólar rinde más, así que a plazo cotiza más barato: hacen falta más dólares por euro (${fx4(fwd)} frente a ${fx4(spot)}). La paridad descubierta diría que se espera esa depreciación, pero a corto plazo a menudo no se cumple.`
        : `El euro rinde más, así que a plazo cotiza más barato: hacen falta menos dólares por euro (${fx4(fwd)} frente a ${fx4(spot)}). La paridad descubierta diría que se espera esa depreciación, pero a corto plazo a menudo no se cumple.`,
    },
  ];
  return (
    <Explainer
      explainerId="FxParity"
      title={t('fxParity.title')}
      description={`Con el EUR/USD a ${fx4(spot)}, un tipo del ${pct(iEur)} en euros y del ${pct(iUsd)} en dólares, el forward a un año es ${fx4(spot)} × (1 + ${pct(iUsd)}) / (1 + ${pct(iEur)}) = ${fx4(fwd)}: la divisa de tipos más altos cotiza más barata a plazo.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        // el balancín se inclina hacia la divisa de tipos más altos a partir del paso 3
        const diff = Math.max(-4, Math.min(4, iUsd - iEur));
        const angle = s >= 2 ? diff * 3 : 0;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <polygon points="160,96 148,118 172,118" fill="var(--surface-2)" stroke="var(--line)" />
            <g transform={`rotate(${angle} 160 96)`}>
              <line x1="50" x2="270" y1="96" y2="96" stroke="var(--accent)" strokeWidth="3" />
              <rect
                x="30"
                y="70"
                width="70"
                height="24"
                rx="4"
                fill="var(--surface-2)"
                stroke="var(--line)"
              />
              <text x="65" y="86" textAnchor="middle" fill="var(--text)" fontSize="11">
                {`€ ${pct(iEur)}`}
              </text>
              <g opacity={s >= 1 ? 1 : 0.3}>
                <rect
                  x="220"
                  y="70"
                  width="70"
                  height="24"
                  rx="4"
                  fill="var(--surface-2)"
                  stroke="var(--line)"
                />
                <text x="255" y="86" textAnchor="middle" fill="var(--text)" fontSize="11">
                  {`$ ${pct(iUsd)}`}
                </text>
              </g>
            </g>
            <text x="160" y="24" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {`Contado ${fx4(spot)}`}
            </text>
            {s >= 2 ? (
              <text x="160" y="42" textAnchor="middle" fill="var(--text)" fontSize="12">
                {`Forward ${fx4(fwd)}`}
              </text>
            ) : null}
            <text x="160" y="134" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {'Cifras ficticias · dólares por euro'}
            </text>
          </svg>
        );
      }}
    />
  );
}
