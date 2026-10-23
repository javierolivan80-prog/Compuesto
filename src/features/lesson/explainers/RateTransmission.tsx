import { monthlyPayment } from '../../../engine/finance';
import { t } from '../../../i18n';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Tipo oficial de partida (%); el Euríbor del ejemplo parte del mismo nivel. */
  rate: number;
  /** Subida del tipo oficial (puntos porcentuales). */
  rise: number;
  onInteract?: (id: string) => void;
}

/** Hipoteca ficticia del ejemplo: 150.000 € a 25 años al Euríbor + 1 %. */
const PRINCIPAL = 150_000;
const YEARS = 25;
const SPREAD = 1;

/** Sin ceros sobrantes: 2 %, 2,5 %, 2,25 %. */
const num = (v: number) =>
  formatNumber(v, Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2);
const pct = (v: number) => `${num(v)}\u00a0%`;
const eur = (v: number) => formatEur(v, 0);

const NODES = ['Tipo oficial', 'Euríbor', 'Cuota', 'Consumo', 'Inflación'] as const;
/** Sentido de cada eslabón tras una subida: sube, sube, sube, suele bajar, suele bajar. */
const ARROWS = ['▲', '▲', '▲', '▼', '▼'] as const;

/**
 * Transmisión de la política monetaria (ANIMACIONES §2, `RateTransmission`): el banco central sube el tipo oficial y
 * se encadenan Euríbor → cuota de una hipoteca ficticia → consumo → precios. Solo la cuota es un cálculo; el resto
 * son tendencias («suele»), sin cifras.
 */
export function RateTransmission({ rate, rise, onInteract }: Props) {
  const after = rate + rise;
  const before = monthlyPayment(PRINCIPAL, rate + SPREAD, YEARS);
  const now = monthlyPayment(PRINCIPAL, after + SPREAD, YEARS);
  const steps: ExplainerStep[] = [
    {
      title: 'Tipo oficial',
      text: `El banco central sube su tipo oficial del ${pct(rate)} al ${pct(after)}: a los bancos les cuesta más el dinero a corto plazo y les rinde más el que dejan en él.`,
    },
    {
      title: 'Euríbor',
      text: `El Euríbor, el tipo al que se prestan los bancos de la zona euro, suele moverse con el tipo oficial y con lo que se espera de él. En el ejemplo parte del ${pct(rate)} y sube igual, al ${pct(after)}.`,
    },
    {
      title: 'Cuota',
      text: `Una hipoteca ficticia de ${eur(PRINCIPAL)} a ${YEARS} años al Euríbor + ${pct(SPREAD)}: en la siguiente revisión, la cuota pasa de ${eur(before)} a ${eur(now)} al mes, ${eur(now - before)} más.`,
    },
    {
      title: 'Consumo',
      text: 'Con cuotas más altas y el ahorro mejor pagado, las familias suelen gastar menos y las empresas, invertir menos.',
    },
    {
      title: 'Precios',
      text: 'Con menos demanda, los precios suelen subir más despacio: la inflación tiende a bajar, con un retraso que suele ser de varios trimestres.',
    },
  ];
  return (
    <Explainer
      explainerId="RateTransmission"
      title={t('rateTransmission.title')}
      description={`El tipo oficial sube del ${pct(rate)} al ${pct(after)}; el Euríbor suele seguirlo; la cuota de una hipoteca ficticia de ${eur(PRINCIPAL)} pasa de ${eur(before)} a ${eur(now)} al mes; el consumo suele bajar y la inflación, frenarse con retraso.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 5);
        const x = (i: number) => 32 + i * 64;
        const values = [pct(after), pct(after), eur(now), '', ''];
        return (
          <svg viewBox="0 0 320 120" className="h-auto w-full" role="presentation">
            <line x1={x(0)} x2={x(4)} y1="52" y2="52" stroke="var(--line)" strokeWidth="2" />
            <line x1={x(0)} x2={x(s)} y1="52" y2="52" stroke="var(--accent)" strokeWidth="3" />
            {NODES.map((name, i) => {
              const on = i <= s;
              return (
                <g key={name} opacity={on ? 1 : 0.35}>
                  <text x={x(i)} y="24" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                    {name}
                  </text>
                  <circle
                    cx={x(i)}
                    cy="52"
                    r="13"
                    fill="var(--surface-1)"
                    stroke={on ? 'var(--accent)' : 'var(--line)'}
                    strokeWidth="2"
                  />
                  <text
                    x={x(i)}
                    y="57"
                    textAnchor="middle"
                    fill={on ? 'var(--text)' : 'var(--text-2)'}
                    fontSize="13"
                  >
                    {ARROWS[i]}
                  </text>
                  {on && values[i] ? (
                    <text x={x(i)} y="86" textAnchor="middle" fill="var(--text)" fontSize="10">
                      {values[i]}
                    </text>
                  ) : null}
                  {on && !values[i] ? (
                    <text x={x(i)} y="86" textAnchor="middle" fill="var(--text)" fontSize="10">
                      {'suele bajar'}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <text x="160" y="112" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {'Cifras ficticias · el efecto llega con retraso'}
            </text>
          </svg>
        );
      }}
    />
  );
}
