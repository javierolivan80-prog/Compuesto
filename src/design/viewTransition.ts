import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './motion';

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Ejecuta un cambio de pantalla con View Transitions (fundido cruzado de 160 ms, ver index.css).
 * Sin soporte o con reduced-motion aplica el cambio directamente; la pantalla de demo usa
 * AnimatePresence de Motion como fallback animado cuando `supportsViewTransitions()` es false.
 */
export function withViewTransition(update: () => void): void {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    update();
    return;
  }
  (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(
    () => flushSync(update),
  );
}
