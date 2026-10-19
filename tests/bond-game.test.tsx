import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BondGame } from '../src/features/games/BondGame';

describe('La emisión de Naranjas (interfaz)', () => {
  it('a la par, dirección y TIR bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<BondGame seed={0} onDone={onDone} />);
    expect(screen.getByTestId('bg-price')).toHaveTextContent('94,69');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4.2' } });
    expect(screen.getByTestId('bg-price')).toHaveTextContent('100,00');
    await user.click(screen.getByRole('button', { name: /^Emitir con un cupón/ }));
    expect(screen.getByTestId('bg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: '▼ Baja' }));
    expect(screen.getByTestId('bg-after')).toHaveTextContent('96,47');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^5,20/ }));
    expect(screen.getByTestId('bg-tir')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('bg-verdict')).toHaveTextContent('impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ price_issue: 100, tir_buy: 5.2 });
  });

  it('un cupón corto explica por qué se capta menos', async () => {
    const user = userEvent.setup();
    render(<BondGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^Emitir con un cupón/ }));
    expect(screen.getByTestId('bg-why')).toHaveTextContent('capta menos');
  });
});
