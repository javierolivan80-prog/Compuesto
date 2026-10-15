import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '../design/ThemeProvider';

const LIGHT = new Set(['mayfair', 'salmon']);

/** Sonner con los tokens del tema. La región es aria-live: los toasts se anuncian. */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={LIGHT.has(theme) ? 'light' : 'dark'}
      position="top-center"
      toastOptions={{
        style: {
          background: 'var(--surface-2)',
          color: 'var(--text)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
        },
      }}
    />
  );
}
