import { t } from '../../../i18n';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  /** Capital inicial (€), rentabilidad bruta anual y gastos corrientes (TER) de los dos fondos (%). */
  amount: number;
  gross: number;
  terCheap: number;
  terDear: number;
  onInteract?: (id: string) => void;
}

const HORIZONS = [5, 10, 20, 30];
const pct = (v: number) => `${formatNumber(v, 1)}\u00a0%`;
const eur = (v: number) => formatEur(Math.round(v), 0);

/**
 * Comisiones (ANIMACIONES §2, `TerDrain`): dos curvas compuestas idénticas salvo por el TER; la del fondo caro pierde
 * un hilo dorado cada año, y la diferencia crece con el tiempo.
 */
export function TerDrain({ amount, gross, terCheap, terDear, onInteract }: Props) {
  const at = (ter: number, y: number) => amount * (1 + (gross - ter) / 100) ** y;
  const steps: ExplainerStep[] = HORIZONS.map((y) => ({
    title: `A ${y} años`,
    text: `El fondo barato llega a ${eur(at(terCheap, y))} y el caro a ${eur(at(terDear, y))}: ${eur(at(terCheap, y) - at(terDear, y))} se han quedado en comisiones y en lo que esas comisiones habrían rendido.`,
  }));
  const end = HORIZONS[HORIZONS.length - 1]!;
  const top = at(terCheap, end) * 1.05;
  const x = (y: number) => 20 + (y / end) * 284;
  const yy = (v: number) => 112 - ((v - amount * 0.9) / (top - amount * 0.9)) * 100;
  return (
    <Explainer
      explainerId="TerDrain"
      title={t('terDrain.title')}
      description={`${eur(amount)} al ${pct(gross)} bruto: con un ${pct(terCheap)} de gastos llegan a ${eur(at(terCheap, end))} en ${end} años; con un ${pct(terDear)}, a ${eur(at(terDear, end))}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        // la curva se dibuja hasta el año que marca el deslizador
        const upTo = Math.max(1, Math.round(time * end));
        const years = Array.from({ length: upTo + 1 }, (_, i) => i);
        const line = (ter: number) => years.map((y) => `${x(y)},${yy(at(ter, y))}`).join(' ');
        const gapTop = yy(at(terCheap, upTo));
        const gapBottom = yy(at(terDear, upTo));
        return (
          <svg viewBox="0 0 320 132" className="h-auto w-full" role="presentation">
            <line x1="16" x2="308" y1="112" y2="112" stroke="var(--line)" />
            <polyline points={line(terCheap)} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
            <polyline
              points={line(terDear)}
              fill="none"
              stroke="var(--bear)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <line
              x1={x(upTo)}
              x2={x(upTo)}
              y1={gapTop}
              y2={gapBottom}
              stroke="var(--accent)"
              strokeWidth="3"
            />
            <text x={x(upTo)} y="126" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              {`Año ${upTo}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
