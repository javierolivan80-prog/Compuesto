import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';
import { BrandDemo } from '../brand/BrandDemo';

export function App() {
  const hash = import.meta.env.DEV ? window.location.hash : '';
  const showTokens = hash === '#tokens';
  const showBrand = hash === '#brand';
  return (
    <ThemeProvider>
      {showTokens ? (
        <TokensDemo />
      ) : showBrand ? (
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
