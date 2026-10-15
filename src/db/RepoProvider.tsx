import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { requestPersistence } from './backup';
import { getDb } from './db';
import { Repository } from './repository';

const RepoContext = createContext<Repository | null>(null);

/** Entrega el repositorio a la app. En tests se le pasa uno sobre una base en memoria. */
export function RepoProvider({ repo, children }: { repo?: Repository; children: ReactNode }) {
  const value = useMemo(() => repo ?? new Repository(getDb()), [repo]);
  useEffect(() => {
    // CLAUDE.md §3b: pedir almacenamiento persistente para que el navegador no borre el progreso
    void requestPersistence();
  }, []);
  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): Repository {
  const repo = useContext(RepoContext);
  if (!repo) throw new Error('useRepo debe usarse dentro de <RepoProvider>');
  return repo;
}
