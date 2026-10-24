import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FxDeskGame } from '../src/features/games/FxDeskGame';

describe('La mesa de divisas (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<FxDeskGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: '12 (superávit)' }));
    expect(screen.getByTestId('fd-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: '1,1216' }));
    expect(screen.getByTestId('fd-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^−2,5/ }));
    expect(screen.getByTestId('fd-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('fd-country-b')).toHaveTextContent('−5,5');
    await user.click(screen.getByRole('radio', { name: 'El país B' }));
    expect(screen.getByTestId('fd-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('fd-verdict')).toHaveTextContent('Mesa redonda');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      current_account: 12,
      forward: 1.1216,
      carry: -2.5,
      hits: 4,
    });
  });

  it('un fallo se marca: las rentas olvidadas dan 20', async () => {
    const user = userEvent.setup();
    render(<FxDeskGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: '20 (superávit)' }));
    expect(screen.getByTestId('fd-why')).toHaveTextContent('✗');
  });
});
