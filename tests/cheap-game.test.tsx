import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { rightVerdict, setupCheap } from '../src/engine/games/cheap-or-dear';
import { CheapGame } from '../src/features/games/CheapGame';

const LABEL = { cheap: 'Barata', fair: 'En precio', dear: 'Cara' } as const;

describe('¿Cara o barata? (interfaz)', () => {
  it('la mediana y el veredicto correcto en las tres: nota máxima y cifras de Naranjas', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const s = setupCheap(2);
    render(<CheapGame seed={2} onDone={onDone} />);
    for (const [i, c] of s.cases.entries()) {
      await user.click(screen.getByRole('radio', { name: /^La mediana/ }));
      expect(screen.getAllByRole('status')[0]).toHaveTextContent('✓');
      await user.click(screen.getByRole('radio', { name: LABEL[rightVerdict(c)] }));
      expect(screen.getByTestId('cd-why')).toHaveTextContent('✓');
      await user.click(
        screen.getByRole('button', { name: i === 2 ? 'Ver el resumen' : 'Siguiente empresa' }),
      );
    }
    expect(screen.getByTestId('cd-verdict')).toHaveTextContent('Perfecto');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      price: 11.09,
      pe_median: 15.4,
      value_pe: 9.24,
    });
  });

  it('elegir la media explica el comparable raro', async () => {
    const user = userEvent.setup();
    render(<CheapGame seed={2} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^La media:/ }));
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('disparatado');
  });
});
