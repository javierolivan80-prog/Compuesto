import { formatNumber } from '../../../lib/format';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Acciones existentes */
  shares: number;
  /** Acciones nuevas que se emiten */
  newShares: number;
  /** Acciones que posee quien mira */
  holding: number;
  onInteract?: (id: string) => void;
}

/** Una tarta que se divide en más porciones: tu porción encoge si no acudes a la ampliación. */
export function ShareDilution({ shares, newShares, holding, onInteract }: Props) {
  const before = (holding / shares) * 100;
  const after = (holding / (shares + newShares)) * 100;
  const subscribed = (holding / shares) * newShares;
  const kept = ((holding + subscribed) / (shares + newShares)) * 100;
  const pct = (n: number) => `${formatNumber(n, 2)} %`;
  const steps: ExplainerStep[] = [
    {
      title: 'Tu parte hoy',
      text: `Con ${formatNumber(holding, 0)} de ${formatNumber(shares, 0)} acciones tienes el ${pct(before)}.`,
    },
    {
      title: 'La ampliación',
      text: `La empresa emite ${formatNumber(newShares, 0)} acciones nuevas: el total sube a ${formatNumber(shares + newShares, 0)}.`,
    },
    {
      title: 'Si no acudes',
      text: `Tus ${formatNumber(holding, 0)} acciones pasan a ser el ${pct(after)}: te han diluido.`,
    },
    {
      title: 'Si acudes con tus derechos',
      text: `Si suscribes ${formatNumber(subscribed, 0)} acciones nuevas, mantienes el ${pct(kept)}.`,
    },
  ];
  return (
    <Explainer
      explainerId="ShareDilution"
      title="Ampliación de capital y dilución"
      description={`Con ${formatNumber(holding, 0)} de ${formatNumber(shares, 0)} acciones tienes el ${pct(before)}. Si la empresa emite ${formatNumber(newShares, 0)} acciones nuevas y no acudes, bajas al ${pct(after)}; si suscribes ${formatNumber(subscribed, 0)} acciones, mantienes el ${pct(kept)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const s = stepAt(t, 4);
        const shown = s === 3 ? kept : s === 2 ? after : before;
        return (
          <svg viewBox="0 0 320 90" className="h-auto w-full" role="presentation">
            <rect
              x="20"
              y="20"
              width="280"
              height="30"
              rx="4"
              fill="var(--surface-1)"
              stroke="var(--brand)"
            />
            <rect
              x="20"
              y="20"
              width={(shown / 100) * 280}
              height="30"
              rx="4"
              fill="var(--brand)"
              opacity={0.85}
            />
            <text
              x="20"
              y="72"
              fill="var(--text)"
              fontSize="11"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              tu parte: {pct(shown)}
            </text>
          </svg>
        );
      }}
    />
  );
}
