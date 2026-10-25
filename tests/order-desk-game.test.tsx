import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderDeskGame } from '../src/features/games/OrderDeskGame';

describe('Mesa de órdenes N5 (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<OrderDeskGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^60,0\spb$/ }));
    expect(screen.getByTestId('od-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText(/10,015\s€/, { selector: 'dd' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^10,0\spb$/ }));
    expect(screen.getByTestId('od-why')).toHaveTextContent('selección adversa');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^1\.200\s€$/ }));
    expect(screen.getByTestId('od-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'La ensancho' }));
    expect(screen.getByTestId('od-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('od-verdict')).toHaveTextContent('Mesa impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      effective_bp: 60,
      realized_bp: 10,
      saving: 1200,
      hits: 4,
    });
  });

  it('un fallo se marca: la horquilla cotizada no es la efectiva', async () => {
    const user = userEvent.setup();
    render(<OrderDeskGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^40,0\spb$/ }));
    expect(screen.getByTestId('od-why')).toHaveTextContent('✗');
  });
});
