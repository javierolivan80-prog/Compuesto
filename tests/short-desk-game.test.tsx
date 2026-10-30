import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShortDeskGame } from '../src/features/games/ShortDeskGame';

describe('La posición corta (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<ShortDeskGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^1\.000\s€$/ }));
    expect(screen.getByTestId('sd-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^20\.000\s€$/ }));
    expect(screen.getByTestId('sd-why')).toHaveTextContent('4.000');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^23,08\s€$/ }));
    expect(screen.getByTestId('sd-why')).toHaveTextContent('no tiene techo');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Notificarla a la CNMV' }));
    expect(screen.getByTestId('sd-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('sd-verdict')).toHaveTextContent('Corto impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      fee: 1000,
      pnl: 20_000,
      call_price: 23.08,
      hits: 4,
    });
  });

  it('un fallo se marca: la comisión no es la de un año entero', async () => {
    const user = userEvent.setup();
    render(<ShortDeskGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^4\.000\s€$/ }));
    expect(screen.getByTestId('sd-why')).toHaveTextContent('✗');
  });
});
