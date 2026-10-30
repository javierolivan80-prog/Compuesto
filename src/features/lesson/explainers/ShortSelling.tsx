import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Acciones prestadas y precio de venta en corto (€). */
  qty: number;
  p0: number;
  /** Precio de recompra si la acción baja y si sube (€). */
  down: number;
  up: number;
  onInteract?: (id: string) => void;
}

const eur = (v: number) => `${formatNumber(v, 2)}\u00a0€`;
const money = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(Math.round(v)), 0)}\u00a0€`;
const n0 = (v: number) => formatNumber(v);

/**
 * Venta en corto (ANIMACIONES §2, `ShortSelling`): pides prestadas unas acciones, las vendes y más tarde las recompras
 * para devolverlas. Si el precio baja, ganas la diferencia; si sube, la pierdes. La ganancia tiene techo (el precio no
 * baja de cero) y la pérdida no.
 */
export function ShortSelling({ qty, p0, down, up, onInteract }: Props) {
  const win = qty * (p0 - down);
  const loss = qty * (p0 - up);
  const steps: ExplainerStep[] = [
    {
      title: 'Pides y vendes',
      text: `Pides prestadas ${n0(qty)} acciones y las vendes a ${eur(p0)}: cobras ${money(qty * p0)}, pero debes devolver ${n0(qty)} acciones.`,
    },
    {
      title: 'Si baja',
      text: `La acción baja a ${eur(down)}: recompras por ${money(qty * down)}, devuelves las acciones y ganas ${money(win)}.`,
    },
    {
      title: 'Si sube',
      text: `La acción sube a ${eur(up)}: recomprar te cuesta ${money(qty * up)} y pierdes ${money(-loss)}.`,
    },
    {
      title: 'La asimetría',
      text: `Lo máximo que puedes ganar es ${money(qty * p0)}, el 100 %, si la acción llega a cero. Lo que puedes perder no tiene techo: el precio puede subir sin límite.`,
    },
  ];
  const top = Math.max(up, p0) * 1.6;
  const y = (p: number) => 110 - (p / top) * 100;
  return (
    <Explainer
      explainerId="ShortSelling"
      title={t('shortSelling.title')}
      description={`Venta en corto de ${n0(qty)} acciones a ${eur(p0)}: si se recompran a ${eur(down)} se ganan ${money(win)}; si se recompran a ${eur(up)} se pierden ${money(-loss)}. La ganancia máxima es ${money(qty * p0)}, el 100 %; la pérdida no tiene límite.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const price = s === 1 ? down : s === 2 ? up : s === 3 ? top * 0.95 : p0;
        const result = qty * (p0 - price);
        return (
          <svg viewBox="0 0 320 130" className="h-auto w-full" role="presentation">
            <line x1="40" y1="110" x2="300" y2="110" stroke="var(--line)" />
            <line
              x1="40"
              y1={y(p0)}
              x2="300"
              y2={y(p0)}
              stroke="var(--text-2)"
              strokeDasharray="4 3"
            />
            <text x="36" y={y(p0) + 3} textAnchor="end" fill="var(--text-2)" fontSize="9">
              {eur(p0)}
            </text>
            <circle
              cx="170"
              cy={y(price)}
              r="6"
              fill={result >= 0 ? 'var(--bull)' : 'var(--bear)'}
            />
            <text x="185" y={y(price) + 3} fill="var(--text)" fontSize="10">
              {s === 3 ? '▲ ∞' : eur(price)}
            </text>
            <text x="160" y="125" textAnchor="middle" fill="var(--text)" fontSize="11">
              {s === 0
                ? `${money(qty * p0)}`
                : s === 3
                  ? t('shortSelling.unlimited')
                  : `${result >= 0 ? '▲ +' : '▼ '}${money(result)}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
