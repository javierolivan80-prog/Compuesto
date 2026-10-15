import { formatEur } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  price: number;
  /** Dividendo por acción en euros */
  dividend: number;
  onInteract?: (id: string) => void;
}

/** Fecha ex-dividendo: el precio cae aproximadamente el importe del dividendo, que pasa a tu cuenta. */
export function ExDividend({ price, dividend, onInteract }: Props) {
  const after = price - dividend;
  const steps: ExplainerStep[] = [
    {
      title: 'Antes de la fecha ex-dividendo',
      text: `La acción cotiza a ${formatEur(price)} y quien la tenga conserva el derecho a cobrar ${formatEur(dividend)} por acción.`,
    },
    {
      title: 'La fecha ex-dividendo',
      text: `Desde esa fecha, quien compra ya no cobra el dividendo. El precio baja aproximadamente su importe: de ${formatEur(price)} a ${formatEur(after)}.`,
    },
    {
      title: 'El dinero pasa a tu cuenta',
      text: `Quien tenía la acción antes cobra ${formatEur(dividend)}: ${formatEur(after)} de acción más ${formatEur(dividend)} en efectivo, ${formatEur(price)} en total.`,
    },
  ];
  return (
    <Explainer
      explainerId="ExDividend"
      title="Fecha ex-dividendo"
      description={`Una acción cotiza a ${formatEur(price)} y paga ${formatEur(dividend)} por acción. En la fecha ex-dividendo el precio baja aproximadamente a ${formatEur(after)} y el dividendo pasa al bolsillo del accionista: el valor total no cambia.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 3);
        const scale = 90 / price;
        const shareH = (s >= 1 ? after : price) * scale;
        const cashH = s >= 2 ? dividend * scale : 0;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            <rect
              x="60"
              y={120 - shareH}
              width="70"
              height={shareH}
              rx="3"
              fill="var(--brand)"
              opacity={0.85}
            />
            <text x="95" y="134" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              acción {formatEur(s >= 1 ? after : price)}
            </text>
            {s >= 2 && (
              <>
                <rect
                  x="170"
                  y={120 - cashH}
                  width="70"
                  height={Math.max(cashH, 2)}
                  rx="3"
                  fill="var(--bull)"
                />
                <text x="205" y="134" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                  dividendo {formatEur(dividend)}
                </text>
              </>
            )}
          </svg>
        );
      }}
    />
  );
}
