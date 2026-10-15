import { ThemeProvider } from '../design/ThemeProvider';
import { TokensDemo } from '../design/TokensDemo';

export function App() {
  const showTokens = import.meta.env.DEV && window.location.hash === '#tokens';
  return (
    <ThemeProvider>
      {showTokens ? (
        <TokensDemo />
      ) : (
        <main>
          <h1>Compuesto</h1>
          <p>20 minutos al día. Se capitalizan.</p>
        </main>
      )}
    </ThemeProvider>
  );
}
