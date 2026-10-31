import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TwoAssetsGame } from '../src/features/games/TwoAssetsGame';

describe('La cartera de dos activos (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<TwoAssetsGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^13,02\s%$/ }));
    expect(screen.getByTestId('ta-why')).toHaveTextContent('diversificar');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^8,0\s%$/ }));
    expect(screen.getByTestId('ta-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^5,75\s%$/ }));
    expect(screen.getByTestId('ta-why')).toHaveTextContent('Sharpe');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^2,80\s%$/ }));
    expect(screen.getByTestId('ta-why')).toHaveTextContent('β = 0,6');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('ta-verdict')).toHaveTextContent('Cartera impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      port_vol: 13.02,
      min_var_w: 8,
      cml: 5.75,
      alpha: 2.8,
      hits: 4,
    });
  });

  it('un fallo se marca: la media ponderada de las volatilidades no es la de la cartera', async () => {
    const user = userEvent.setup();
    render(<TwoAssetsGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^15,20\s%$/ }));
    expect(screen.getByTestId('ta-why')).toHaveTextContent('✗');
  });
});
