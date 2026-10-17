import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../../lib/reduced-motion';
import { t } from '../../../i18n';

interface Props {
  /** Duración de la cuenta atrás. */
  ms: number;
  /** Cambia para reiniciar la cuenta (p. ej. el índice de la tarjeta). */
  resetKey: string | number;
  /** false = modo sin tiempo (accesibilidad): no hay cuenta atrás. */
  active: boolean;
  /** Pausa (p. ej. mientras se ve el resultado de la jugada). */
  paused?: boolean;
  onExpire: () => void;
}

/** Cuenta atrás de una jugada: barra que se vacía (solo transform). Con reduced-motion muestra los segundos en texto. */
export function Deadline({ ms, resetKey, active, paused = false, onExpire }: Props) {
  const bar = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [secs, setSecs] = useState(Math.ceil(ms / 1000));
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (!active || paused) return;
    const total = ms;
    const start = performance.now();
    const timer = window.setTimeout(() => expire.current(), total);
    let tick = 0;
    if (reduced) {
      tick = window.setInterval(
        () => setSecs(Math.max(0, Math.ceil((total - (performance.now() - start)) / 1000))),
        250,
      );
    }
    const anim =
      !reduced && bar.current && typeof bar.current.animate === 'function'
        ? bar.current.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
            duration: total,
            easing: 'linear',
            fill: 'forwards',
          })
        : null;
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
      anim?.cancel();
    };
  }, [ms, resetKey, active, paused, reduced]);

  if (!active) return null;
  return (
    <div className="flex items-center gap-3" data-testid="deadline">
      <span
        className="bg-surface-2 block h-1.5 w-full overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <span ref={bar} className="kit-deadline-bar bg-brand block h-full w-full" />
      </span>
      {reduced && (
        <span data-num className="text-text-2 min-w-8 text-sm">
          {t('games.seconds', { n: secs })}
        </span>
      )}
    </div>
  );
}
