import { dur, prefersReducedMotion } from '../../../design/motion';

/* Efectos imperativos del kit sobre un elemento (Web Animations API: solo transform y opacity).
   Con reduced-motion, el movimiento se sustituye por un fundido breve sin perder información. */

/** Sacudida: traslación horizontal de 5 px, 2 ciclos, 180 ms (amplitud decreciente, nunca aleatoria). */
export function shake(el: HTMLElement, amplitude = 5): Animation | null {
  if (typeof el.animate !== 'function') return null;
  if (prefersReducedMotion())
    return el.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
  const a = Math.min(6, Math.max(4, amplitude));
  return el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: `translateX(${-a}px)` },
      { transform: `translateX(${a}px)` },
      { transform: `translateX(${-a * 0.5}px)` },
      { transform: `translateX(${a * 0.5}px)` },
      { transform: 'translateX(0)' },
    ],
    { duration: 180, easing: 'linear' },
  );
}

/** Anticipación: el elemento se encoge un 3 % durante 150 ms antes de revelar el resultado. */
export function anticipate(el: HTMLElement): Promise<void> {
  if (typeof el.animate !== 'function' || prefersReducedMotion()) return Promise.resolve();
  const anim = el.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.97)' }], {
    duration: 150,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    fill: 'forwards',
  });
  return anim.finished.then(
    () => anim.cancel(),
    () => undefined,
  );
}

/** Pop (rebote de recompensa): escala 1 → 1,08 → 1 en `dur.short`. Solo recompensas. */
export function rewardPop(el: HTMLElement): Animation | null {
  if (typeof el.animate !== 'function' || prefersReducedMotion()) return null;
  return el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
    {
      duration: dur.short * 1000,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    },
  );
}
