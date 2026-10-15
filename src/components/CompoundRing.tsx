import { m, useReducedMotion } from 'motion/react';
import { dur, ease } from '../design/motion';
import { formatNumber } from '../lib/format';

interface Props {
  /** 0–1 */
  progress: number;
  label: string;
  size?: number;
}

const R = 44;
const C = 2 * Math.PI * R;

/** Anillo de progreso con la curva del interés compuesto dentro. Se anima con stroke-dashoffset (compuesto). */
export function CompoundRing({ progress, label, size = 120 }: Props) {
  const reduced = useReducedMotion();
  const p = Math.min(1, Math.max(0, progress));
  return (
    <svg
      role="img"
      aria-label={`${label}: ${formatNumber(Math.round(p * 100))} %`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
    >
      <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
      <m.circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={C}
        initial={false}
        animate={{ strokeDashoffset: C * (1 - p) }}
        transition={{ duration: reduced ? dur.micro : dur.long, ease: ease.out }}
        transform="rotate(-90 50 50)"
      />
      <path
        d="M30 66 C 42 65, 52 60, 68 34"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="68" cy="34" r="2.5" fill="var(--brand)" />
    </svg>
  );
}
