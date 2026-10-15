import { m, useReducedMotion } from 'motion/react';
import { ease } from '../../design/motion';
import { Logo } from '../../brand/Logo';
import { formatNumber } from '../../lib/format';

interface Props {
  rank: string;
  streak: number;
  accuracy: number;
}

/** Tarjeta compartible que se "imprime" de arriba abajo como un ticket de terminal (600 ms). Solo XP/progreso, nunca dinero. */
export function TicketPrint({ rank, streak, accuracy }: Props) {
  const reduced = useReducedMotion();
  return (
    <section
      aria-label="Tarjeta compartible"
      className="border-line overflow-hidden rounded-[var(--radius-sm)] border"
    >
      <div className="bg-surface-2 h-2" aria-hidden="true" />
      <div className="overflow-hidden">
        <m.div
          className="bg-surface-1 grid gap-2 p-4 font-mono"
          style={{ fontFamily: 'var(--font-mono)' }}
          initial={reduced ? false : { y: '-100%' }}
          animate={{ y: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.6, ease: ease.out }}
        >
          <Logo variant="full" size={28} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-text-2">Rango</dt>
            <dd>{rank}</dd>
            <dt className="text-text-2">Racha</dt>
            <dd data-num>{formatNumber(streak)} días</dd>
            <dt className="text-text-2">Precisión</dt>
            <dd data-num>{formatNumber(accuracy)} %</dd>
          </dl>
        </m.div>
      </div>
    </section>
  );
}
