import { m, useReducedMotion } from 'motion/react';
import { DelayMount } from '../../components/DelayMount';
import { Confetti } from '../../components/Confetti';
import { CURVE_PATH } from '../../brand/Logo';
import { ease } from '../../design/motion';
import { Button } from '../../components/Button';

const E = ease.out;

/** Subida de rango, 1.800 ms (ANIMACIONES §4). Estado final estático y descripción accesible con reduced-motion. */
export function RankUp({
  rank,
  onContinue,
  hideContinue = false,
}: {
  rank: string;
  onContinue?: () => void;
  /** Dentro de otra pantalla que ya tiene su botón (p. ej. el cierre de lección). */
  hideContinue?: boolean;
}) {
  const reduced = useReducedMotion();
  const t = (delay: number, duration: number) =>
    reduced ? { duration: 0.01 } : { delay, duration, ease: E };
  return (
    <section
      aria-label={`Subida de rango: ${rank}`}
      className="relative grid min-h-80 place-items-center overflow-hidden rounded-[var(--radius-md)] p-6"
    >
      {/* 0–200 ms: la UI se atenúa */}
      <m.div
        aria-hidden="true"
        className="bg-bg absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={t(0, 0.2)}
      />
      <div className="relative grid justify-items-center gap-4 text-center">
        {/* 200–700 ms: se dibuja la curva dorada */}
        <svg viewBox="0 0 64 64" width="120" height="120" aria-hidden="true">
          <m.path
            d={CURVE_PATH}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={t(0.2, 0.5)}
          />
        </svg>
        {/* 700–1.100 ms: el rango en serif, escala 1,1 → 1 + fundido */}
        <m.h2
          className="text-4xl"
          initial={reduced ? false : { scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={t(0.7, 0.4)}
        >
          {rank}
        </m.h2>
        {/* 1.100–1.500 ms: insignia con reflejo */}
        <m.div
          className="review-tag border-brand text-brand rounded-full border px-4 py-1 text-sm"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={t(1.1, 0.4)}
        >
          Nuevo rango desbloqueado
        </m.div>
        {/* 1.500–1.800 ms: botón (el confeti ya está en marcha) */}
        <m.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={t(1.5, 0.3)}
        >
          {!hideContinue && <Button onClick={onContinue}>Continuar</Button>}
        </m.div>
      </div>
      <DelayMount ms={1500}>
        <Confetti />
      </DelayMount>
    </section>
  );
}
