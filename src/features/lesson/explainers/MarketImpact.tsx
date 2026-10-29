import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Punto medio (€). */
  mid: number;
  /** Media horquilla y salto entre niveles del libro (€). */
  half: number;
  /** Acciones a la venta en cada nivel. */
  depth: number;
  onInteract?: (id: string) => void;
}

/** Niveles del libro de ventas que se dibujan. */
const LEVELS = 6;

const eur = (v: number) => `${formatNumber(v, 2)}\u00a0€`;
const eur3 = (v: number) => `${formatNumber(v, 3)}\u00a0€`;
const bp = (v: number) => `${formatNumber(v, 1)}\u00a0pb`;
const n0 = (v: number) => formatNumber(v);

/**
 * Impacto de mercado (ANIMACIONES §2, `MarketImpact`): una orden de compra cada vez más grande barre el libro de
 * ventas nivel a nivel. El precio medio se aleja del punto medio y el impacto, en pb, crece más que el tamaño. Parte
 * de lo visto en n1-u4 y añade el coste de impacto: (precio medio − punto medio) / punto medio, en pb.
 */
export function MarketImpact({ mid, half, depth, onInteract }: Props) {
  const askAt = (i: number) => Math.round((mid + half + i * half) * 100) / 100;
  /** Precio medio de comprar `qty` acciones barriendo el libro. */
  const avg = (qty: number) => {
    let left = qty;
    let cost = 0;
    for (let i = 0; left > 0 && i < LEVELS; i++) {
      const take = Math.min(left, depth);
      cost += take * askAt(i);
      left -= take;
    }
    return cost / qty;
  };
  const impact = (qty: number) => ((avg(qty) - mid) / mid) * 10_000;
  const sizes = [depth / 2, depth * 2, depth * 5];
  const [small, medium, large] = sizes as [number, number, number];
  const steps: ExplainerStep[] = [
    {
      title: 'Pequeña',
      text: `Una compra de ${n0(small)} acciones cabe en el primer nivel: paga ${eur(askAt(0))}, ${bp(impact(small))} sobre el punto medio de ${eur(mid)}: es su coste de impacto.`,
    },
    {
      title: 'Mediana',
      text: `Con ${n0(medium)} acciones barre dos niveles: precio medio de ${eur3(avg(medium))}, ${bp(impact(medium))} sobre el punto medio.`,
    },
    {
      title: 'Grande',
      text: `Con ${n0(large)} acciones barre cinco niveles: ${eur3(avg(large))} de media, ${bp(impact(large))}. Diez veces más acciones que la pequeña, y un coste de impacto tres veces mayor por acción.`,
    },
    {
      title: 'Qué hacer',
      text: 'Por eso los bloques grandes se trocean en el tiempo, se lanzan con algoritmos o se cruzan en un dark pool al punto medio: para no pagar todo el libro de una vez.',
    },
  ];
  return (
    <Explainer
      explainerId="MarketImpact"
      title={t('marketImpact.title')}
      description={`Coste de impacto de una compra según su tamaño. Libro de ventas con ${n0(depth)} acciones por nivel desde ${eur(askAt(0))}, punto medio ${eur(mid)}: comprar ${n0(small)} acciones cuesta ${bp(impact(small))}; ${n0(medium)}, ${bp(impact(medium))}; ${n0(large)}, ${bp(impact(large))}.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const qty = sizes[Math.min(s, 2)]!;
        const barW = 200;
        return (
          <svg viewBox="0 0 320 140" className="h-auto w-full" role="presentation">
            {Array.from({ length: LEVELS }, (_, i) => {
              const used = Math.max(0, Math.min(depth, qty - i * depth));
              const y = 12 + i * 18;
              return (
                <g key={i}>
                  <text x="62" y={y + 11} textAnchor="end" fill="var(--text-2)" fontSize="10">
                    {eur(askAt(i))}
                  </text>
                  <rect
                    x="70"
                    y={y}
                    width={barW}
                    height="13"
                    rx="2"
                    fill="var(--surface-2)"
                    stroke="var(--line)"
                  />
                  {used > 0 ? (
                    <rect
                      x="70"
                      y={y}
                      width={(barW * used) / depth}
                      height="13"
                      rx="2"
                      fill="var(--bear)"
                      opacity="0.5"
                    />
                  ) : null}
                </g>
              );
            })}
            <text x="160" y="134" textAnchor="middle" fill="var(--text)" fontSize="10">
              {`${n0(qty)} acciones · media ${eur3(avg(qty))} · ${bp(impact(qty))}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
