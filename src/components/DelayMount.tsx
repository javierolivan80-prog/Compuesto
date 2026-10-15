import { useEffect, useState, type ReactNode } from 'react';

/** Monta a sus hijos tras `ms` milisegundos (para encadenar fases de una secuencia). */
export function DelayMount({ ms, children }: { ms: number; children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return on ? <>{children}</> : null;
}
