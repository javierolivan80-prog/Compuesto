import { THEMES } from '../design/themes';
import { useTheme } from '../design/ThemeProvider';
import { Bolsin, BOLSIN_STATES } from './Bolsin';
import { Avatar, CHARACTERS, type CharacterId } from './Characters';
import { Logo } from './Logo';

/** Página de prueba de marca (solo desarrollo, `#brand`). La integra /styleguide en 0.5. */
export function BrandDemo() {
  const { theme, setTheme } = useTheme();
  return (
    <main style={{ padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-6)' }}>
      <label>
        Tema{' '}
        <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <section
        aria-label="Logo"
        style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}
      >
        <Logo variant="full" size={56} />
        <Logo variant="symbol" size={56} />
      </section>
      <section
        aria-label="Bolsín"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}
      >
        {BOLSIN_STATES.map((s) => (
          <Bolsin key={s} state={s} size={110} />
        ))}
      </section>
      <section
        aria-label="Personajes"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}
      >
        {(Object.keys(CHARACTERS) as CharacterId[]).map((c) => (
          <Avatar key={c} character={c} size={110} />
        ))}
      </section>
    </main>
  );
}
