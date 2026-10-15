import { motion, useReducedMotion } from 'motion/react';
import { CURVE_PATH } from '../brand/Logo';
import { dur, ease } from '../design/motion';

interface Props {
  value: number;
  max: number;
  label: string;
  /** En el último ejercicio la barra se convierte en la curva compuesta. */
  asCurve?: boolean;
}

export function ProgressBar({ value, max, label, asCurve = false }: Props) {
  const reduced = useReducedMotion();
  const ratio = Math.min(1, Math.max(0, value / max));

  if (asCurve) {
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <svg
          viewBox="0 0 64 64"
          className="h-10 w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.path
            d={CURVE_PATH}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: ratio }}
            transition={{ duration: dur.long, ease: ease.out }}
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="bg-surface-2 h-2 w-full overflow-hidden rounded-full"
    >
      <motion.div
        className="bg-brand h-full w-full origin-left rounded-full"
        initial={false}
        animate={{ scaleX: ratio }}
        transition={{ duration: reduced ? dur.micro : dur.medium, ease: ease.out }}
      />
    </div>
  );
}
