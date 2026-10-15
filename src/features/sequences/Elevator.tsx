import { motion, useReducedMotion } from 'motion/react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { ease } from '../../design/motion';

/** Ascensor entre plantas, 1.400 ms: puertas 300 ms · contador 600 ms con vibración 2 px · puertas se abren 500 ms. */
export function Elevator({ from, to, name }: { from: number; to: number; name: string }) {
  const reduced = useReducedMotion();
  const door = (side: 'l' | 'r') => ({
    initial: reduced ? { scaleX: 0 } : { scaleX: 0 },
    animate: reduced ? { scaleX: 0 } : { scaleX: [0, 1, 1, 0] },
    transition: reduced
      ? { duration: 0.01 }
      : { duration: 1.4, times: [0, 0.214, 0.643, 1], ease: ease.inOut },
    style: { transformOrigin: side === 'l' ? 'left' : 'right' },
  });
  return (
    <section
      aria-label={`Ascensor: de la planta ${from} a la planta ${to}, ${name}`}
      className="bg-surface-1 border-line relative grid h-56 place-items-center overflow-hidden rounded-[var(--radius-md)] border"
    >
      <motion.div
        className="grid justify-items-center gap-1"
        animate={reduced ? {} : { x: [0, 2, -2, 2, -2, 0] }}
        transition={reduced ? undefined : { delay: 0.3, duration: 0.6 }}
      >
        <span className="text-text-2 text-sm">Planta</span>
        <span className="text-5xl" style={{ fontFamily: 'var(--font-mono)' }}>
          <AnimatedNumber
            key={`${from}-${to}`}
            initial={from}
            value={to}
            duration={reduced ? 0.01 : 0.6}
          />
        </span>
        <span className="text-xl">{name}</span>
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="bg-surface-2 border-line absolute inset-y-0 left-0 w-1/2 border-r"
        {...door('l')}
      />
      <motion.div
        aria-hidden="true"
        className="bg-surface-2 border-line absolute inset-y-0 right-0 w-1/2 border-l"
        {...door('r')}
      />
    </section>
  );
}
