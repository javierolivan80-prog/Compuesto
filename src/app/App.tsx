import { useEffect, useState } from 'react';
import { BrandDemo } from '../brand/BrandDemo';
import { getLesson, lessonsOfUnit } from '../content/library';
import { RepoProvider } from '../db/RepoProvider';
import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';
import { HomeMinimal } from '../features/home/HomeMinimal';
import { LessonScreen } from '../features/lesson/LessonScreen';
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
  const hash = useHashRoute();
  const match = /^#\/leccion\/([a-z0-9-]+)$/.exec(hash);
  const lesson = match ? getLesson(match[1]!) : undefined;
  const go = (h: string) => {
    window.location.hash = h;
    window.scrollTo(0, 0);
  };
  return (
    <main id="contenido" className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-6 p-6">
      {lesson ? (
        <LessonScreen key={lesson.id} lesson={lesson} onExit={() => go('#/')} />
      ) : (
        <HomeMinimal lessons={lessonsOfUnit(0, 1)} onStart={(id) => go(`#/leccion/${id}`)} />
      )}
    </main>
  );
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
