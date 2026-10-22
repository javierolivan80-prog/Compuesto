import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Inflación interanual que espera el consenso (%). */
  consensus: number;
  onInteract?: (id: string) => void;
}

const pct = (v: number) => `${formatNumber(v, 1)}\u00a0%`;

/**
 * Sorpresa de un dato (ANIMACIONES §2, `DataSurprise`): el dato cae por debajo, en línea o por encima del consenso, y
 * la rentabilidad del bono a 2 años reacciona a la diferencia, no al nivel. Movimientos ilustrativos, sin cifras.
 */
export function DataSurprise({ consensus, onInteract }: Props) {
  const cases = [
    { d: -0.3, move: -1 },
    { d: 0, move: 0 },
    { d: 0.3, move: 1 },
  ];
  const steps: ExplainerStep[] = [
    {
      title: 'Por debajo',
      text: `El consenso espera un ${pct(consensus)}. Si el dato sale en un ${pct(consensus - 0.3)}, hay menos inflación de la esperada: el mercado ve menos subidas de tipos y la rentabilidad del bono a 2 años baja.`,
    },
    {
      title: 'En línea',
      text: `Si sale justo en el ${pct(consensus)}, no hay sorpresa: el mercado apenas se mueve, aunque la inflación sea alta, porque ya estaba en el precio.`,
    },
    {
      title: 'Por encima',
      text: `Si sale en un ${pct(consensus + 0.3)}, la sorpresa es al alza: la rentabilidad a 2 años sube y el precio del bono baja.`,
    },
    {
      title: 'La regla',
      text: 'Lo que mueve el precio es la diferencia entre el dato y lo esperado, no el nivel del dato.',
    },
  ];
  return (
    <Explainer
      explainerId="DataSurprise"
      title={t('dataSurprise.title')}
      description={`Con un consenso del ${pct(consensus)}, un dato por debajo baja la rentabilidad a 2 años, uno en línea no la mueve y uno por encima la sube.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const c = cases[Math.min(s, 2)]!;
        const x = (v: number) => 160 + (v / 0.6) * 120;
        const dato = consensus + c.d;
        const arrowY = c.move === 0 ? 0 : -c.move * 22;
        return (
          <svg viewBox="0 0 320 132" className="h-auto w-full" role="presentation">
            <line x1="30" x2="290" y1="40" y2="40" stroke="var(--line)" />
            <line
              x1={x(0)}
              x2={x(0)}
              y1="28"
              y2="52"
              stroke="var(--text-2)"
              strokeDasharray="3 3"
            />
            <text x={x(0)} y="20" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {`Consenso ${pct(consensus)}`}
            </text>
            <circle cx={x(c.d)} cy="40" r="6" fill="var(--accent)" />
            <text x={x(c.d)} y="66" textAnchor="middle" fill="var(--text)" fontSize="10">
              {`Dato ${pct(dato)}`}
            </text>
            <text x="90" y="104" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {'Rentabilidad a 2 años'}
            </text>
            <g transform={`translate(200 100)`}>
              {c.move === 0 ? (
                <text x="0" y="4" textAnchor="middle" fill="var(--text)" fontSize="12">
                  {'= sin cambios'}
                </text>
              ) : (
                <>
                  <line
                    x1="0"
                    x2="0"
                    y1="0"
                    y2={arrowY}
                    stroke={c.move > 0 ? 'var(--bear)' : 'var(--bull)'}
                    strokeWidth="3"
                  />
                  <polygon
                    points={
                      c.move > 0
                        ? `0,${arrowY - 6} -6,${arrowY + 2} 6,${arrowY + 2}`
                        : `0,${arrowY + 6} -6,${arrowY - 2} 6,${arrowY - 2}`
                    }
                    fill={c.move > 0 ? 'var(--bear)' : 'var(--bull)'}
                  />
                  <text x="14" y={arrowY / 2 + 4} fill="var(--text)" fontSize="11">
                    {c.move > 0 ? '▲ sube' : '▼ baja'}
                  </text>
                </>
              )}
            </g>
          </svg>
        );
      }}
    />
  );
}
