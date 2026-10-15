import { THEMES } from './themes';
import { useTheme } from './ThemeProvider';

const SWATCHES = [
  'bg',
  'surface-1',
  'surface-2',
  'text',
  'text-2',
  'brand',
  'accent',
  'bull',
  'bear',
  'info',
];

/** Página de prueba de tokens (solo desarrollo, `#tokens`). La sustituye /styleguide en la tarea 0.5. */
export function TokensDemo() {
  const { theme, setTheme } = useTheme();
  return (
    <main style={{ padding: 'var(--space-6)', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-3xl)' }}>Tokens</h1>
      <label htmlFor="theme-select">Tema</label>{' '}
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as typeof theme)}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <p>
        Precio <span data-num>1.234,56 €</span>{' '}
        <span style={{ color: 'var(--bull)' }}>▲ +1,2 %</span>{' '}
        <span style={{ color: 'var(--bear)' }}>▼ −0,8 %</span>
      </p>
      <ul
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          padding: 0,
          listStyle: 'none',
        }}
      >
        {SWATCHES.map((s) => (
          <li
            key={s}
            style={{
              background: `var(--${s})`,
              color: s === 'text' || s === 'text-2' ? 'var(--bg)' : 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3)',
              minWidth: 96,
            }}
          >
            {s}
          </li>
        ))}
      </ul>
    </main>
  );
}
