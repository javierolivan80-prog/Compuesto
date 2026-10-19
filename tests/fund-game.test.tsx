import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SITUATIONS } from '../src/engine/games/fund-fees';
import { FundGame } from '../src/features/games/FundGame';

describe('Dos fondos, veinte años (interfaz)', () => {
  it('todo bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<FundGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^Unos 8\.100/ }));
    expect(screen.getByTestId('fg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    const groups = screen.getAllByRole('radiogroup');
    for (const [i, x] of SITUATIONS.entries())
      await user.click(
        within(groups[i]!).getByRole('radio', { name: x.right === 'etf' ? 'ETF' : 'Fondo' }),
      );
    await user.click(screen.getByRole('button', { name: 'Comprobar' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^Traspaso/ }));
    expect(screen.getByTestId('fg-switch')).toHaveTextContent('760');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('fg-verdict')).toHaveTextContent('Impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ tax: 760, vehicle_hits: 4 });
  });
});
