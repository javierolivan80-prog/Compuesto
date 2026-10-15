import { useEffect, useState, type ReactNode } from 'react';
import { BrandDemo } from '../brand/BrandDemo';
import { getLesson, getPlacement, lessonsOfUnit, unitsOfLevel } from '../content/library';
import { RepoProvider, useRepo } from '../db/RepoProvider';
import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';
import { HomeMinimal } from '../features/home/HomeMinimal';
import { LessonScreen } from '../features/lesson/LessonScreen';
import { Onboarding } from '../features/onboarding/Onboarding';
import { LevelSkip } from '../features/placement/LevelSkip';
import { PlacementScreen } from '../features/placement/PlacementScreen';
import { ExercisesLab } from './ExercisesLab';
import { Styleguide } from './Styleguide';

/** Ruta mínima por hash: `#/leccion/<id>`. PROVISIONAL(tarea 1.7): se sustituye por la navegación de 5 pestañas. */
function useHashRoute() {
  const read = () => window.location.hash;
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const on = () => setHash(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function Product() {
  const repo = useRepo();
  const hash = useHashRoute();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

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

  const go = (h: string) => {
    window.location.hash = h;
    window.scrollTo(0, 0);
  };

  const lessonMatch = /^#\/leccion\/([a-z0-9-]+)$/.exec(hash);
  const skipUnit = /^#\/salto\/([a-z0-9-]+)$/.exec(hash);
  const skipLevel = /^#\/saltar-nivel\/(\d+)$/.exec(hash);

  let body: ReactNode;
  if (onboarded === null) {
    body = <p className="text-text-2">Cargando…</p>;
  } else if (!onboarded) {
    body = (
      <Onboarding
        onFinish={() => {
          setOnboarded(true);
          go(`#/leccion/${lessonsOfUnit(0, 1)[0]?.id ?? ''}`);
        }}
      />
    );
  } else if (lessonMatch && getLesson(lessonMatch[1]!)) {
    const lesson = getLesson(lessonMatch[1]!)!;
    body = <LessonScreen key={lesson.id} lesson={lesson} onExit={() => go('#/')} />;
  } else if (skipUnit && getPlacement(skipUnit[1]!)) {
    const unitId = skipUnit[1]!;
    const unit = unitsOfLevel(Number(/^n(\d+)-/.exec(unitId)?.[1] ?? 0)).find(
      (u) => u.id === unitId,
    );
    const level = Number(/^n(\d+)-/.exec(unitId)?.[1] ?? 0);
    body = (
      <PlacementScreen
        key={unitId}
        bank={getPlacement(unitId)!}
        unitName={unit?.name ?? unitId}
        level={level}
        continueLabel="Volver al inicio"
        onDone={() => go('#/')}
        onExit={() => go('#/')}
        onStudy={() => go(`#/leccion/${firstLessonOf(unitId) ?? ''}`)}
      />
    );
  } else if (skipLevel) {
    const level = Number(skipLevel[1]);
    body = (
      <LevelSkip
        key={level}
        level={level}
        onExit={() => go('#/')}
        onStudy={(u) => go(`#/leccion/${firstLessonOf(u) ?? ''}`)}
      />
    );
  } else {
    body = (
      <HomeMinimal
        key={hash}
        lessons={lessonsOfUnit(0, 1)}
        onStart={(id) => go(`#/leccion/${id}`)}
        onSkipUnit={(u) => go(`#/salto/${u}`)}
        onSkipLevel={(l) => go(`#/saltar-nivel/${l}`)}
      />
    );
  }

  return (
    <main id="contenido" className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-6 p-6">
      {body}
    </main>
  );
}

/** Primera lección de una unidad con contenido; undefined si aún no hay (las unidades se producen por fases). */
function firstLessonOf(unitId: string): string | undefined {
  const m = /^n(\d+)-u(\d+)$/.exec(unitId);
  return m ? lessonsOfUnit(Number(m[1]), Number(m[2]))[0]?.id : undefined;
}

/** Las rutas de prueba solo existen en desarrollo: en producción import.meta.env.DEV es false. */
export function App() {
  const dev = import.meta.env.DEV;
  const path = dev ? window.location.pathname : '';
  const hash = dev ? window.location.hash : '';
  return (
    <ThemeProvider>
      <RepoProvider>
        {path === '/exercises-lab' ? (
          <ExercisesLab />
        ) : path === '/styleguide' ? (
          <Styleguide />
        ) : hash === '#tokens' ? (
          <TokensDemo />
        ) : hash === '#brand' ? (
          <BrandDemo />
        ) : (
          <Product />
        )}
      </RepoProvider>
    </ThemeProvider>
  );
}
