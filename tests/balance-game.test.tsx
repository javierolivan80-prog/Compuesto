import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupBalance, SIDE_OF } from '../src/engine/games/balance-builder';
import { BalanceGame } from '../src/features/games/BalanceGame';

const SIDE = { activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio neto' } as const;
const entries = () =>
  screen
    .getByRole('group', { name: '¿Qué apunte recoge la operación?' })
    .querySelectorAll('button');

describe('Cuadra el balance (interfaz)', () => {
  it('jugando bien: el balance de 2024 cuadra, los cinco apuntes son correctos y devuelve las cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const setup = setupBalance(1);
    render(<BalanceGame seed={1} onDone={onDone} />);
    expect(screen.getByTestId('bb-check')).toHaveTextContent('Partidas colocadas: 0 de 8');
    for (const id of setup.order)
      await user.click(screen.getByRole('button', { name: SIDE[SIDE_OF[id]] }));
    expect(screen.getByTestId('bb-check')).toHaveTextContent('Cuadra');
    expect(screen.getByTestId('bb-total-a')).toHaveTextContent('48.608');
    for (const [i, op] of setup.ops.entries()) {
      await user.click(entries()[op.right]!);
      expect(screen.getAllByRole('status').at(-2)).toHaveTextContent('✓');
      await user.click(
        screen.getByRole('button', {
          name: i === setup.ops.length - 1 ? 'Ver el balance final' : 'Siguiente operación',
        }),
      );
    }
    expect(screen.getByTestId('bb-hits')).toHaveTextContent('8 de 8 partidas y 5 de 5 apuntes');
    expect(screen.getByTestId('bb-verdict')).toHaveTextContent('Perfecto');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      cash_end: 7539,
      total_end: 47928,
      margin: 1520,
    });
  });

  it('un fallo al clasificar se explica y un apunte equivocado muestra el correcto', async () => {
    const user = userEvent.setup();
    const setup = setupBalance(1);
    render(<BalanceGame seed={1} onDone={() => {}} />);
    const first = setup.order[0]!;
    const wrong = SIDE_OF[first] === 'activo' ? 'Pasivo' : 'Activo';
    await user.click(screen.getByRole('button', { name: wrong }));
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('✗');
    for (const id of setup.order.slice(1))
      await user.click(screen.getByRole('button', { name: SIDE[SIDE_OF[id]] }));
    const op = setup.ops[0]!;
    await user.click(entries()[(op.right + 1) % 3]!);
    expect(screen.getByText(/El apunte correcto:/)).toBeInTheDocument();
  });
});
