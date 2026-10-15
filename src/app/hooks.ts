import { useCallback, useEffect, useState } from 'react';
import { useRepo } from '../db/RepoProvider';
import type { AppEvent } from '../engine/events';
import type { Summary } from '../engine/projections';

export interface AppData {
  summary: Summary | null;
  events: AppEvent[];
  loading: boolean;
  /** No se pudo leer el almacenamiento local */
  error: boolean;
  reload: () => void;
}

/** Resumen (XP, racha, progreso, ajustes) y eventos desde el repositorio; se recarga a petición. */
export function useAppData(): AppData {
  const repo = useRepo();
  const [state, setState] = useState<Omit<AppData, 'reload'>>({
    summary: null,
    events: [],
    loading: true,
    error: false,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([repo.summary(), repo.allEvents()])
      .then(
        ([summary, events]) => alive && setState({ summary, events, loading: false, error: false }),
      )
      .catch((e) => {
        console.error('No se pudo leer el almacenamiento', e);
        if (alive) setState({ summary: null, events: [], loading: false, error: true });
      });
    return () => {
      alive = false;
    };
  }, [repo, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Estado de la conexión. La app funciona igual sin ella (local-first): solo se avisa. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
