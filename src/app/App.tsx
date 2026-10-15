import { BrandDemo } from '../brand/BrandDemo';
import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';
import { ExercisesLab } from './ExercisesLab';
import { Styleguide } from './Styleguide';

/** Las rutas de prueba solo existen en desarrollo: en producción import.meta.env.DEV es false. */
export function App() {
  const dev = import.meta.env.DEV;
  const hash = dev ? window.location.hash : '';
  const isStyleguide = dev && window.location.pathname === '/styleguide';
  return (
    <ThemeProvider>
      {dev && window.location.pathname === '/exercises-lab' ? (
        <ExercisesLab />
      ) : isStyleguide ? (
        <Styleguide />
      ) : hash === '#tokens' ? (
        <TokensDemo />
      ) : hash === '#brand' ? (
        <BrandDemo />
      ) : (
        <main>
          <h1>Compuesto</h1>
          <p>20 minutos al día. Se capitalizan.</p>
        </main>
      )}
    </ThemeProvider>
  );
}
