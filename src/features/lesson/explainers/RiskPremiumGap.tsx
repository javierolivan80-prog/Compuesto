import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Rentabilidad del Bund alemán a 10 años (%). */
  bund: number;
  /** Prima de riesgo de partida (puntos básicos). */
  spread: number;
  onInteract?: (id: string) => void;
}

/** Ensanchamiento del ejemplo (pb) y deuda nueva sobre la que se calcula su coste (millones de €). */
const WIDEN = 100;
const NEW_DEBT = 1000;

/** Sin ceros sobrantes: 2 %, 2,5 %, 2,35 %. */
const num = (v: number) =>
  formatNumber(v, Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2);
const pct = (v: number) => `${num(v)}\u00a0%`;
const bp = (v: number) => `${formatNumber(v)}\u00a0pb`;

/**
 * Prima de riesgo (ANIMACIONES §2, `RiskPremiumGap`): dos barras, el Bund alemán y el bono español a 10 años; el
 * hueco entre ellas es la prima. Después se ensancha 100 pb y se ve lo que cuesta en intereses de la deuda nueva.
 * Las causas son tendencias («suelen»), sin cifras.
 */
export function RiskPremiumGap({ bund, spread, onInteract }: Props) {
  const spain = Math.round((bund + spread / 100) * 100) / 100;
  const wide = Math.round((spain + WIDEN / 100) * 100) / 100;
  const extra = (NEW_DEBT * WIDEN) / 10_000;
  const steps: ExplainerStep[] = [
    {
      title: 'Bund',
      text: `El Bund alemán a 10 años rinde un ${pct(bund)}: es la referencia de menor riesgo de la zona euro.`,
    },
    {
      title: 'Prima',
      text: `El bono español a 10 años rinde un ${pct(spain)}. La diferencia, (${pct(spain)} − ${pct(bund)}) × 100, es la prima de riesgo: ${bp(spread)}.`,
    },
    {
      title: 'Causas',
      text: 'Los inversores suelen pedir más si ven más riesgo: deuda/PIB alta, déficit persistente, poco crecimiento o inestabilidad política. En una crisis, además, suelen refugiarse en el Bund, y la prima se ensancha.',
    },
    {
      title: 'Coste',
      text: `Si la prima sube ${bp(WIDEN)}, a ${bp(spread + WIDEN)}, cada ${formatNumber(NEW_DEBT)} millones de € de deuda nueva a 10 años cuesta unos ${formatNumber(extra)} millones más de intereses al año. Las empresas españolas, que suelen financiarse por encima de su Estado, también lo notan.`,
    },
  ];
  return (
    <Explainer
      explainerId="RiskPremiumGap"
      title={t('riskPremiumGap.title')}
      description={`El Bund alemán a 10 años rinde un ${pct(bund)} y el bono español, un ${pct(spain)}: la prima de riesgo es de ${bp(spread)}. Si se ensancha ${bp(WIDEN)}, el bono español pasa a rendir un ${pct(wide)} y cada ${formatNumber(NEW_DEBT)} millones de deuda nueva cuesta unos ${formatNumber(extra)} millones más al año.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const top = wide + 0.8;
        // eje: 0 % abajo (y = 116), `top` arriba (y = 16)
        const y = (v: number) => 116 - (v / top) * 100;
        const right = s >= 3 ? wide : spain;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <line x1="20" x2="300" y1="116" y2="116" stroke="var(--line)" strokeWidth="1" />
            <rect
              x="30"
              y={y(bund)}
              width="56"
              height={116 - y(bund)}
              rx="4"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            <text x="58" y="132" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {'Bund 10 años'}
            </text>
            <text x="58" y={y(bund) - 6} textAnchor="middle" fill="var(--text)" fontSize="11">
              {pct(bund)}
            </text>
            <g opacity={s >= 1 ? 1 : 0.25}>
              <rect
                x="150"
                y={y(bund)}
                width="56"
                height={116 - y(bund)}
                rx="4"
                fill="var(--surface-2)"
                stroke="var(--line)"
              />
              <rect
                x="150"
                y={y(right)}
                width="56"
                height={y(bund) - y(right)}
                fill="var(--accent)"
                opacity="0.55"
              />
              <text x="178" y="132" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                {'España 10 años'}
              </text>
              <text x="178" y={y(right) - 6} textAnchor="middle" fill="var(--text)" fontSize="11">
                {pct(right)}
              </text>
              <line
                x1="86"
                x2="150"
                y1={y(bund)}
                y2={y(bund)}
                stroke="var(--line)"
                strokeDasharray="3 3"
              />
              <text
                x="118"
                y={(y(bund) + y(right)) / 2 + 4}
                textAnchor="middle"
                fill="var(--text)"
                fontSize="11"
              >
                {bp(s >= 3 ? spread + WIDEN : spread)}
              </text>
            </g>
            {s === 2 ? (
              <text x="266" y="40" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                {'deuda · déficit'}
              </text>
            ) : null}
            {s === 2 ? (
              <text x="266" y="54" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                {'crecimiento'}
              </text>
            ) : null}
            {s >= 3 ? (
              <text x="266" y="40" textAnchor="middle" fill="var(--text)" fontSize="10">
                {`▲ +${formatNumber(extra)} M€/año`}
              </text>
            ) : null}
          </svg>
        );
      }}
    />
  );
}
