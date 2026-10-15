import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { t } from '../i18n';
import { installMode } from './platform';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** Guía de instalación: botón nativo en Chrome/Android, pasos en iPhone (con el aviso de los 7 días de Safari). */
export function InstallGuide() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPrompt(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const mode = installMode({
    nav: navigator as unknown as Parameters<typeof installMode>[0]['nav'],
    displayModeStandalone: standalone,
    hasPrompt: !!prompt,
  });

  return (
    <section aria-labelledby="s-instalar" className="grid gap-3">
      <h2 id="s-instalar" className="text-2xl">
        {t('pwa.install.title')}
      </h2>
      {mode === 'installed' ? (
        <p className="text-text-2 text-sm">{t('pwa.install.installed')}</p>
      ) : (
        <>
          <p className="text-text-2 text-sm">{t('pwa.install.intro')}</p>
          {mode === 'ios' && (
            <>
              <p className="text-sm">{t('pwa.install.iosWarning')}</p>
              <ol className="text-text-2 grid list-decimal gap-1 pl-5 text-sm">
                <li>{t('pwa.install.iosStep1')}</li>
                <li>{t('pwa.install.iosStep2')}</li>
                <li>{t('pwa.install.iosStep3')}</li>
              </ol>
            </>
          )}
          {mode === 'prompt' && (
            <Button
              variant="secondary"
              className="justify-self-start"
              onClick={() => void prompt?.prompt()}
            >
              {t('pwa.install.androidAction')}
            </Button>
          )}
          {mode === 'manual' && (
            <p className="text-text-2 text-sm">{t('pwa.install.androidHint')}</p>
          )}
        </>
      )}
    </section>
  );
}

/** Estado real del modo sin conexión: "lista" solo cuando el service worker ya está activo y ha precacheado la app. */
export function OfflineStatus() {
  const [state, setState] = useState<'preparing' | 'ready' | 'unavailable'>(
    'serviceWorker' in navigator ? 'preparing' : 'unavailable',
  );
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let alive = true;
    void navigator.serviceWorker.ready.then(() => alive && setState('ready'));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <p className="text-text-2 text-sm" data-testid="offline-status">
      {t(`pwa.offline.${state}`)}
    </p>
  );
}
