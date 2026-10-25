import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BankGame } from '../src/features/games/BankGame';

describe('¿Qué banco compras? (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<BankGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^12\s%$/ }));
    expect(screen.getByTestId('bv-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: '1,10x' }));
    expect(screen.getByTestId('bv-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: '1,25x' }));
    expect(screen.getByTestId('bv-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Banca Malvarrosa' }));
    expect(screen.getByTestId('bv-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('bv-verdict')).toHaveTextContent('Análisis redondo');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      rote: 12,
      pvtc: 1.1,
      justified: 1.25,
      hits: 4,
    });
  });

  it('un fallo se marca: el ROE no es el ROTE', async () => {
    const user = userEvent.setup();
    render(<BankGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^10,5\s%$/ }));
    expect(screen.getByTestId('bv-why')).toHaveTextContent('✗');
  });
});
