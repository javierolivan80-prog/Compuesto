import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from '../components/Toaster';
import { TabBar } from '../components/TabBar';
import { OfflineBanner } from '../components/States';
import { getLesson, getPlacement, lessonsOfUnit, unitsOfLevel } from '../content/library';
import { useRepo } from '../db/RepoProvider';
import { Camino } from '../features/camino/Camino';
import { Ajustes } from '../features/despacho/Ajustes';
import { Despacho } from '../features/despacho/Despacho';
import { Reportes } from '../features/despacho/Reportes';
import { Glosario } from '../features/glossary/Glosario';
import { Home } from '../features/home/Home';
import { LessonScreen } from '../features/lesson/LessonScreen';
import { Onboarding } from '../features/onboarding/Onboarding';
import { LevelSkip } from '../features/placement/LevelSkip';
import { PlacementScreen } from '../features/placement/PlacementScreen';
import { Practicar } from '../features/practicar/Practicar';
import { Rivales } from '../features/practicar/Rivales';
import { backupReminder } from '../engine/pwa';
import { exportBackup, requestPersistence } from '../db/backup';
import { downloadText } from '../lib/download';
import { dayKey } from '../engine/days';
import { toast } from 'sonner';
import { BackupReminderBanner, UpdateBanner } from '../pwa/PwaBanners';
import { usePwa } from '../pwa/usePwa';
import { setHapticsEnabled } from '../lib/haptics';
import { useAppData, useOnline } from './hooks';
import { parseRoute, tabOf } from './routes';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

/** Primera lección de una unidad con contenido; undefined si aún no hay (las unidades se producen por fases). */
function firstLessonOf(unitId: string): string | undefined {
  const m = /^n(\d+)-u(\d+)$/.exec(unitId);
  return m ? lessonsOfUnit(Number(m[1]), Number(m[2]))[0]?.id : undefined;
}

const levelOf = (unitId: string) => Number(/^n(\d+)-/.exec(unitId)?.[1] ?? 0);

export const go = (hash: string) => {
  window.location.hash = hash;
  window.scrollTo(0, 0);
};

/** La app de producto: onboarding → 5 pestañas, y pantallas completas para lecciones y tests de salto. */
export function Product() {
  const repo = useRepo();
  const hash = useHash();
  const route = parseRoute(hash);
  const online = useOnline();
  const data = useAppData();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // el SW nunca avisa ni recarga con una lección o un test en curso
  const busy = route.name === 'leccion' || route.name === 'salto' || route.name === 'saltar-nivel';
  const pwa = usePwa(busy);

  // se pide al navegador que no borre los datos en cuanto hay algo que proteger
  const hasProgress = (data.summary?.xp.total ?? 0) > 0;
  useEffect(() => {
    if (hasProgress) void requestPersistence();
  }, [hasProgress]);

  const [dismissedNow, setDismissedNow] = useState(false);
  const reminder = data.summary
    ? backupReminder({
        now: new Date(),
        lastBackupAt: strSetting(data.summary.settings['lastBackupAt']),
        lastDismissedAt: strSetting(data.summary.settings['backupReminderDismissedAt']),
        hasProgress,
      })
    : null;

  const exportNow = async () => {
    try {
      const backup = await exportBackup(repo);
      const ok = downloadText(
        `compuesto-copia-${dayKey(new Date(), 'Europe/Madrid')}.json`,
        JSON.stringify(backup),
        'application/json',
      );
      if (ok)
        await repo.record('settings_changed', {
          key: 'lastBackupAt',
          value: new Date().toISOString(),
        });
      toast(ok ? 'Copia exportada.' : 'No se pudo exportar en este navegador.');
      data.reload();
    } catch {
      toast('No se pudo exportar la copia.');
    }
  };
  const dismissReminder = async () => {
    setDismissedNow(true);
    await repo.record('settings_changed', {
      key: 'backupReminderDismissedAt',
      value: new Date().toISOString(),
    });
  };

  // el ajuste de háptica se aplica al arrancar
  useEffect(() => {
    if (data.summary) setHapticsEnabled(data.summary.settings['haptics'] !== false);
  }, [data.summary]);

  useEffect(() => {
    let alive = true;
    repo
      .summary()
      .then((s) => alive && setOnboarded(s.settings['onboarded'] === true))
      // si no se puede leer el almacenamiento, no se bloquea al usuario con el onboarding
      .catch(() => alive && setOnboarded(true));
    return () => {
      alive = false;
    };
  }, [repo]);

  // cada cambio de pantalla recarga los datos (XP, racha, progreso) desde los eventos
  const { reload } = data;
  useEffect(() => {
    reload();
  }, [hash, reload]);

  let body: ReactNode;
  let fullScreen = false;

  if (onboarded === null) {
    body = <p className="text-text-2">Cargando…</p>;
    fullScreen = true;
  } else if (!onboarded) {
    fullScreen = true;
    body = (
      <Onboarding
        onFinish={() => {
          setOnboarded(true);
          go(`#/leccion/${lessonsOfUnit(0, 1)[0]?.id ?? ''}`);
        }}
      />
    );
  } else {
    switch (route.name) {
      case 'leccion': {
        const lesson = getLesson(route.id);
        body = lesson ? (
          <LessonScreen key={lesson.id} lesson={lesson} onExit={() => go('#/')} />
        ) : (
          <Home data={data} onStart={(id) => go(`#/leccion/${id}`)} />
        );
        fullScreen = !!lesson;
        break;
      }
      case 'salto': {
        const bank = getPlacement(route.unitId);
        const level = levelOf(route.unitId);
        const unit = unitsOfLevel(level).find((u) => u.id === route.unitId);
        fullScreen = !!bank;
        body = bank ? (
          <PlacementScreen
            key={route.unitId}
            bank={bank}
            unitName={unit?.name ?? route.unitId}
            level={level}
            continueLabel="Volver al inicio"
            onDone={() => go('#/')}
            onExit={() => go('#/camino')}
            onStudy={() => go(`#/leccion/${firstLessonOf(route.unitId) ?? ''}`)}
          />
        ) : (
          <Home data={data} onStart={(id) => go(`#/leccion/${id}`)} />
        );
        break;
      }
      case 'saltar-nivel':
        fullScreen = true;
        body = (
          <LevelSkip
            key={route.level}
            level={route.level}
            onExit={() => go('#/camino')}
            onStudy={(u) => go(`#/leccion/${firstLessonOf(u) ?? ''}`)}
          />
        );
        break;
      case 'camino':
        body = (
          <Camino
            data={data}
            onStart={(id) => go(`#/leccion/${id}`)}
            onSkipUnit={(u) => go(`#/salto/${u}`)}
            onSkipLevel={(l) => go(`#/saltar-nivel/${l}`)}
          />
        );
        break;
      case 'practicar':
        body = <Practicar data={data} onStart={(id) => go(`#/leccion/${id}`)} />;
        break;
      case 'rivales':
        body = <Rivales />;
        break;
      case 'despacho':
        body = <Despacho data={data} />;
        break;
      case 'ajustes':
        body = <Ajustes data={data} />;
        break;
      case 'glosario':
        body = <Glosario />;
        break;
      case 'reportes':
        body = <Reportes />;
        break;
      default:
        body = <Home data={data} onStart={(id) => go(`#/leccion/${id}`)} />;
    }
  }

  const showTabs = !fullScreen;
  return (
    <>
      <Toaster />
      <a
        href="#contenido"
        onClick={(e) => (e.preventDefault(), document.getElementById('contenido')?.focus())}
        className="sr-only focus:not-sr-only focus:underline"
      >
        Saltar al contenido
      </a>
      <main
        id="contenido"
        tabIndex={-1}
        className={`mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-6 p-6 outline-none ${showTabs ? 'pb-28' : ''}`}
      >
        {!online && <OfflineBanner />}
        {showTabs && pwa.updateAvailable && (
          <UpdateBanner forced={pwa.forced} onApply={pwa.apply} onDismiss={pwa.dismiss} />
        )}
        {showTabs && route.name === 'home' && reminder?.due && !dismissedNow && (
          <BackupReminderBanner
            days={reminder.days}
            onExport={() => void exportNow()}
            onDismiss={() => void dismissReminder()}
          />
        )}
        {showTabs && route.name !== 'home' && backLink(route.name)}
        {body}
      </main>
      {showTabs && <TabBar active={tabOf(route)} />}
    </>
  );
}

/** Enlace "Volver" en las pantallas que cuelgan de Despacho. */
function backLink(name: string): ReactNode {
  if (name !== 'ajustes' && name !== 'glosario' && name !== 'reportes') return null;
  return (
    <a href="#/despacho" className="text-text-2 min-h-12 self-start text-sm underline">
      ← Despacho
    </a>
  );
}

const strSetting = (v: unknown): string | null => (typeof v === 'string' ? v : null);
