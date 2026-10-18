import { useRef, type MouseEvent, type ReactNode } from 'react';

/** Ventana y radio en los que dos toques seguidos cuentan como un doble toque accidental. */
const WINDOW_MS = 400;
const RADIUS_PX = 24;

/**
 * Evita que un doble toque decida dos veces en un juego por pasos: el segundo toque caería sobre el botón que el
 * primero acaba de hacer aparecer en el mismo sitio (p. ej. «Siguiente» → la primera opción del paso nuevo) o
 * repetiría una acción con consecuencias (comprar otra vez). Se ignora el segundo clic de un doble clic
 * (`detail ≥ 2`) y, en táctil, un toque muy cercano en tiempo y posición al anterior. Los botones que se pulsan
 * a ráfagas a propósito (−/+) llevan `data-repeat`.
 */
export function TapGuard({ children }: { children: ReactNode }) {
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  const onClickCapture = (e: MouseEvent) => {
    const target = e.target instanceof Element ? e.target.closest('button, [role=radio]') : null;
    if (!target || target.closest('[data-repeat]')) return;
    const native = e.nativeEvent as PointerEvent;
    const now = performance.now();
    const prev = last.current;
    const touchRepeat =
      native.pointerType === 'touch' &&
      prev !== null &&
      now - prev.t < WINDOW_MS &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < RADIUS_PX;
    if (e.detail >= 2 || touchRepeat) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    last.current = { t: now, x: e.clientX, y: e.clientY };
  };
  return <div onClickCapture={onClickCapture}>{children}</div>;
}
