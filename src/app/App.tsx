import { useEffect } from 'react';
import { BrandDemo } from '../brand/BrandDemo';
import { RepoProvider } from '../db/RepoProvider';
import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';
import { installErrorLog } from '../lib/error-log';
import { ExercisesLab } from './ExercisesLab';
import { Product } from './Product';
import { Styleguide } from './Styleguide';

/** Las rutas de prueba solo existen en desarrollo: en producción import.meta.env.DEV es false. */
export function App() {
  useEffect(() => installErrorLog(), []);
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
