import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { decideSwAction, parseSwControl } from '../engine/pwa';

const KILLED_KEY = 'compuesto-sw-killed';
/** Una vez activado el interruptor, cualquier registro posterior de esta carga se desregistra al nacer. */
let killed = false;

async function wipeCaches() {
  if (typeof caches !== 'undefined') {
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  }
}

/** Desregistra todos los service workers y vacía las cachés; recarga una vez si la página estaba controlada por uno. */
export async function killServiceWorkers(): Promise<void> {
  killed = true;
  const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
  await Promise.all(regs.map((r) => r.unregister()));
  await wipeCaches();
  const wasControlled = !!navigator.serviceWorker?.controller;
  try {
    // evita un bucle de recargas si el interruptor sigue activo en el servidor
    if (wasControlled && sessionStorage.getItem(KILLED_KEY) !== '1') {
      sessionStorage.setItem(KILLED_KEY, '1');
      window.location.reload();
    }
  } catch {
    /* sin sessionStorage: no se recarga */
  }
}

/**
 * Service worker de la app: aviso de nueva versión, actualización forzada por versión mínima
 * e interruptor de emergencia. `busy` = hay una lección en curso: nunca se avisa ni se recarga entonces.
 */
export function usePwa(busy: boolean) {
  const reg = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [forced, setForced] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, r) => {
      reg.current = r;
      if (killed && r) void r.unregister().then(wipeCaches);
    },
  });

  // control remoto: se pide siempre a la red; sin conexión o con datos raros no se hace nada
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const ctrl = new AbortController();
    fetch('/sw-control.json', { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: unknown) => {
        const action = decideSwAction(parseSwControl(raw), __APP_VERSION__);
        if (action === 'kill') void killServiceWorkers();
        else if (action === 'force-update') {
          setForced(true);
          void reg.current?.update();
        }
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  // una actualización forzada se aplica en cuanto no hay lección en curso
  useEffect(() => {
    if (forced && needRefresh && !busy) void updateServiceWorker(true);
  }, [forced, needRefresh, busy, updateServiceWorker]);

  const apply = useCallback(() => void updateServiceWorker(true), [updateServiceWorker]);
  const dismiss = useCallback(() => setNeedRefresh(false), [setNeedRefresh]);

  return {
    /** Hay versión nueva y se puede ofrecer (nunca mientras hay una lección en curso). */
    updateAvailable: needRefresh && !busy,
    forced,
    offlineReady,
    apply,
    dismiss,
  };
}
