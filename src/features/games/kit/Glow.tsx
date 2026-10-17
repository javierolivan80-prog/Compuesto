import type { ReactNode } from 'react';

/** Brillo de acierto: el borde se ilumina en bull y se apaga en 300 ms al cambiar `pulse` (clave que cambia en cada acierto). */
export function Glow({
  pulse,
  children,
  className = '',
}: {
  pulse: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div key={pulse} className={`kit-glow ${className}`} data-glow={pulse > 0 ? 'on' : 'off'}>
      {children}
    </div>
  );
}
