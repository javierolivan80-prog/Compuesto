import { LazyMotion } from 'motion/react';
import { useEffect } from 'react';
import { BrandDemo } from '../brand/BrandDemo';
import { RepoProvider } from '../db/RepoProvider';
import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';
import { installErrorLog } from '../lib/error-log';
import { ExercisesLab } from './ExercisesLab';
import { GamesLab } from './GamesLab';
import { Product } from './Product';
import { Styleguide } from './Styleguide';

/** Las rutas de prueba solo existen en desarrollo: en producción import.meta.env.DEV es false. */
export function App() {
  useEffect(() => installErrorLog(), []);
  // laboratorios: en desarrollo, o en una compilación de medición con VITE_LAB=1 (nunca en la de producción)
  const dev = import.meta.env.DEV || import.meta.env.VITE_LAB === '1';
  const path = dev ? window.location.pathname : '';
  const hash = dev ? window.location.hash : '';
  return (
    <ThemeProvider>
      <LazyMotion features={() => import('../design/motion-features').then((m) => m.default)}>
        <RepoProvider>
          {path === '/exercises-lab' ? (
            <ExercisesLab />
          ) : path === '/games-lab' ? (
            <GamesLab />
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
      </LazyMotion>
    </ThemeProvider>
  );
}
