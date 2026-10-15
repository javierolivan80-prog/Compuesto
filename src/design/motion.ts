/** Tokens de motion de docs/ANIMACIONES.md §1. Personalidad "Premium": precisa, sin rebote en UI. */
type Bezier = [number, number, number, number];

export const ease: { out: Bezier; inOut: Bezier; exit: Bezier } = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.65, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
};

export const spring = {
  /** Sheets, tarjetas, arrastres: sin rebote. */
  ui: { type: 'spring', stiffness: 400, damping: 40 },
  /** Solo recompensas: rebote leve. */
  reward: { type: 'spring', stiffness: 300, damping: 18 },
} as const;

/** Duraciones en segundos (unidad de Motion). */
export const dur = {
  micro: 0.12,
  short: 0.2,
  medium: 0.32,
  long: 0.6,
  story: { min: 1.2, max: 2 },
} as const;

export const stagger = 0.04;

export const cssEase = {
  out: `cubic-bezier(${ease.out.join(', ')})`,
  inOut: `cubic-bezier(${ease.inOut.join(', ')})`,
  exit: `cubic-bezier(${ease.exit.join(', ')})`,
} as const;

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}

/**
 * Con reduced-motion el movimiento se sustituye por un fundido casi instantáneo:
 * la información no se pierde (DESIGN.md §4).
 */
export function transition<T extends { duration?: number }>(
  t: T,
  reduced = prefersReducedMotion(),
) {
  return reduced ? { duration: dur.micro } : t;
}
