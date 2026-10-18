import { setWorstCase, worstCaseOn } from './worst-seeds';

/** Interruptor de desarrollo «Demo / Peor caso» (break-ui). Neutro y fuera del diseño: no se traduce ni se publica. */
export function DevDataToggle() {
  if (!import.meta.env.DEV) return null;
  const on = worstCaseOn();
  const seg = (active: boolean) => ({
    padding: '4px 10px',
    borderRadius: 999,
    border: 0,
    background: active ? '#fff' : 'transparent',
    font: '12px system-ui, sans-serif',
    color: '#222',
  });
  return (
    <div
      data-testid="dev-data-toggle"
      style={{
        position: 'fixed',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#ddd',
        borderRadius: 999,
        padding: 2,
        zIndex: 1000,
        display: 'flex',
      }}
    >
      <button type="button" style={seg(!on)} onClick={() => on && setWorstCase(false)}>
        {'Demo'}
      </button>
      <button type="button" style={seg(on)} onClick={() => !on && setWorstCase(true)}>
        {'Peor caso'}
      </button>
    </div>
  );
}
