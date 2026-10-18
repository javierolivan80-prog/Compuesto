import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupFirstShares } from '../src/engine/games/first-shares';
import { FirstSharesGame } from '../src/features/games/FirstSharesGame';
import { t } from '../src/i18n';

const LABEL = { up: /Sube/, down: /Baja/, flat: /Apenas se mueve/ } as const;

describe('Tus primeras acciones (interfaz)', () => {
  it('acertar las cinco noticias: precio, capitalización y nota máxima; devuelve las cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const setup = setupFirstShares(1);
    render(<FirstSharesGame seed={1} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'Tus primeras acciones' })).toBeInTheDocument();
    expect(
      screen.getByText(/tu abuela te regaló 100 acciones de Naranjas del Turia/),
    ).toBeInTheDocument();

    for (const [i, r] of setup.rounds.entries()) {
      expect(screen.getByTestId('fs-round')).toHaveTextContent(`Noticia ${i + 1} de 5`);
      await user.click(screen.getByRole('button', { name: LABEL[r.news.move] }));
      expect(await screen.findByRole('status')).toHaveTextContent('✓');
      await user.click(
        screen.getByRole('button', { name: i === 4 ? 'Ver el resultado' : 'Siguiente noticia' }),
      );
    }

    expect(await screen.findByTestId('fs-done')).toBeInTheDocument();
    expect(screen.getByTestId('fs-verdict')).toHaveTextContent('Acertaste 5 de 5');
    expect(screen.getByTestId('fs-stake')).toHaveTextContent('962,00 € → 986,00 €');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    const values = onDone.mock.calls[0]![0];
    expect(values).toMatchObject({ start: 9.62, end: 9.86, shares: 12_000_000, hits: 5 });
    expect(values.cap_end).toBe(118_320_000);
  });

  it('fallar: la noticia explica por qué y se marca el error', async () => {
    const user = userEvent.setup();
    const setup = setupFirstShares(1);
    render(<FirstSharesGame seed={1} onDone={() => {}} />);
    const wrong = setup.rounds[0]!.news.move === 'up' ? 'down' : 'up';
    await user.click(screen.getByRole('button', { name: LABEL[wrong] }));
    expect(await screen.findByRole('status')).toHaveTextContent('✗');
    expect(
      screen.getByText(t(`firstShares.news.${setup.rounds[0]!.news.id}.why`)),
    ).toBeInTheDocument();
  });
});
