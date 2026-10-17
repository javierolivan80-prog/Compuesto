import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { TokensDemo } from '../src/design/TokensDemo';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeProvider', () => {
  it('usa Mayfair (papel claro) por defecto', () => {
    render(
      <ThemeProvider>
        <TokensDemo />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('mayfair');
  });

  it('cambia de tema sin recargar y lo persiste', async () => {
    render(
      <ThemeProvider>
        <TokensDemo />
      </ThemeProvider>,
    );
    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText('Tema'), 'tokio');
    });
    expect(document.documentElement.dataset.theme).toBe('tokio');
    expect(localStorage.getItem('compuesto.theme')).toBe('tokio');
  });

  it('recupera el tema guardado y descarta valores inválidos', () => {
    localStorage.setItem('compuesto.theme', 'noche');
    const { unmount } = render(
      <ThemeProvider>
        <TokensDemo />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('noche');
    unmount();
    localStorage.setItem('compuesto.theme', 'inventado');
    render(
      <ThemeProvider>
        <TokensDemo />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('mayfair');
  });
});
