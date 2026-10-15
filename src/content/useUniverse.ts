import { useEffect, useState } from 'react';
import type { Company } from './schemas';

/** Carga perezosa del universo de empresas; null mientras llega. */
export function useUniverse(): readonly Company[] | null {
  const [companies, setCompanies] = useState<readonly Company[] | null>(null);
  useEffect(() => {
    let alive = true;
    // tras el primer pintado: la cinta no es lo primero que se necesita
    const load = () => void import('./universe').then((m) => alive && setCompanies(m.companies()));
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const handle = idle ? idle(load) : window.setTimeout(load, 200);
    return () => {
      alive = false;
      void handle;
    };
  }, []);
  return companies;
}
