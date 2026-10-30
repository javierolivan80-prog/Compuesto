import { t } from '../../../i18n';
import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Garantía depositada (€) y caída del activo en contra (%). */
  deposit: number;
  move: number;
  onInteract?: (id: string) => void;
}

/** Apalancamientos que se recorren paso a paso. */
const LEVERS = [1, 5, 10, 30] as const;
/** Cierre de la posición cuando la garantía cae a la mitad (normas de la ESMA para CFD a minoristas). */
const CLOSE_OUT = 50;

const money = (v: number) => `${formatNumber(Math.round(v), 0)}\u00a0€`;
const pct = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0%`;

/**
 * Apalancamiento y cierre de posición (ANIMACIONES §2, `MarginCall`): la misma caída del activo se come una parte cada
 * vez mayor de la garantía al subir el apalancamiento, hasta tocar la línea del 50 % en la que el proveedor de CFD
 * cierra la posición.
 */
export function MarginCall({ deposit, move, onInteract }: Props) {
  const lossPct = (lev: number) => Math.min(100, lev * move);
  const steps: ExplainerStep[] = LEVERS.map((lev, i) => {
    const lp = lossPct(lev);
    const closed = lp >= CLOSE_OUT;
    return {
      title: `${lev}:1`,
      text:
        i === 0
          ? `Sin apalancamiento, una caída del ${pct(move)} te quita el ${pct(lp)} de tus ${money(deposit)}: ${money((deposit * lp) / 100)}.`
          : closed
            ? `Con ${lev}:1, controlas ${money(deposit * lev)}. Basta una caída del ${pct(Math.round((CLOSE_OUT / lev) * 100) / 100)} para perder la mitad de la garantía: ahí el proveedor cierra la posición, y la pérdida ya es de al menos ${money(deposit / 2)}.`
            : `Con ${lev}:1, controlas ${money(deposit * lev)}: la misma caída del ${pct(move)} te quita el ${pct(lp)} de la garantía, ${money((deposit * lp) / 100)}.`,
    };
  });
  return (
    <Explainer
      explainerId="MarginCall"
      title={t('marginCall.title')}
      description={`Garantía de ${money(deposit)} y una caída del ${pct(move)}: sin apalancamiento se pierde el ${pct(lossPct(1))}; con 5:1, el ${pct(lossPct(5))}; con 10:1, el ${pct(lossPct(10))}; con 30:1 se llega al cierre de la posición cuando la garantía cae a la mitad.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, LEVERS.length);
        const lp = Math.min(lossPct(LEVERS[s]!), s === LEVERS.length - 1 ? CLOSE_OUT : 100);
        const W = 260;
        return (
          <svg viewBox="0 0 320 100" className="h-auto w-full" role="presentation">
            <rect
              x="30"
              y="30"
              width={W}
              height="26"
              rx="3"
              fill="var(--surface-2)"
              stroke="var(--line)"
            />
            <rect
              x="30"
              y="30"
              width={(W * (100 - lp)) / 100}
              height="26"
              rx="3"
              fill="var(--bull)"
              opacity="0.45"
            />
            <line
              x1={30 + W / 2}
              y1="22"
              x2={30 + W / 2}
              y2="64"
              stroke="var(--bear)"
              strokeDasharray="4 3"
            />
            <text x={30 + W / 2} y="76" textAnchor="middle" fill="var(--text-2)" fontSize="9">
              {t('marginCall.closeOut')}
            </text>
            <text x="160" y="18" textAnchor="middle" fill="var(--text)" fontSize="11">
              {`${LEVERS[s]}:1 · ${t('marginCall.left')} ${pct(100 - lp)}`}
            </text>
          </svg>
        );
      }}
    />
  );
}
