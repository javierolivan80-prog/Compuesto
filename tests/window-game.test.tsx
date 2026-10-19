import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WindowGame } from '../src/features/games/WindowGame';

describe('El escaparate del banco (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<WindowGame seed={0} onDone={onDone} />);
    const groups = screen.getAllByRole('radiogroup');
    const right = ['No complejo', 'No complejo', 'Complejo', 'Complejo'];
    for (const [i, g] of groups.entries()) {
      const radio = [...g.querySelectorAll('[role="radio"]')].find(
        (b) => b.textContent === right[i],
      )!;
      await user.click(radio);
    }
    await user.click(screen.getByRole('button', { name: 'Comprobar' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^450/ }));
    expect(screen.getByTestId('wn-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^800\.000/ }));
    expect(screen.getByTestId('wn-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^\+80/ }));
    expect(screen.getByTestId('wn-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('wn-verdict')).toHaveTextContent('Impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      saving: 450,
      min_dividend: 800,
      pnl: 80,
      complex_hits: 4,
    });
  });
});
