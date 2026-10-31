import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TimeMachineGame } from '../src/features/games/TimeMachineGame';

describe('Máquina del tiempo (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<TimeMachineGame seed={0} onDone={onDone} />);
    expect(screen.getByText(/aproximadas e ilustrativas/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^23\.300\s€$/ }));
    expect(screen.getByTestId('tm-why')).toHaveTextContent('2,33');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^7,00\s%$/ }));
    expect(screen.getByTestId('tm-why')).toHaveTextContent('colas gordas');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^2,5$/ }));
    expect(screen.getByTestId('tm-why')).toHaveTextContent('zona roja');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Mantener el plan y rebalancear si toca' }));
    expect(screen.getByTestId('tm-why')).toHaveTextContent('margin call');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('tm-verdict')).toHaveTextContent('Viaje impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      var_eur: 23300,
      cvar_pct: 7,
      expected: 2.5,
      observed: 12,
      hits: 4,
    });
  });

  it('un fallo se marca: el VaR con el z del 95 % no es el del 99 %', async () => {
    const user = userEvent.setup();
    render(<TimeMachineGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^16\.500\s€$/ }));
    expect(screen.getByTestId('tm-why')).toHaveTextContent('✗');
  });
});
