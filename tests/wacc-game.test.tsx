import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WaccGame } from '../src/features/games/WaccGame';

describe('La mezcla de la financiación (interfaz)', () => {
  it('la beta bien y el mínimo: nota máxima y cifras de Naranjas', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<WaccGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: '0,77' }));
    expect(screen.getByRole('status')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('wg-wacc')).toHaveTextContent('8,27');
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Más deuda' }));
    expect(screen.getByTestId('wg-wacc')).toHaveTextContent('7,90');
    await user.click(screen.getByRole('button', { name: /^Proponer un 35\s%/ }));
    expect(screen.getByTestId('wg-reveal')).toHaveTextContent('Has dado con el mínimo');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('wg-verdict')).toHaveTextContent('Perfecto');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ beta_l: 0.7719, best: 35, pick: 35 });
  });

  it('olvidar apalancar la beta lo explica con Hamada', async () => {
    const user = userEvent.setup();
    render(<WaccGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: '0,65' }));
    expect(screen.getByRole('status')).toHaveTextContent('✗');
    expect(screen.getByRole('status')).toHaveTextContent('Hamada');
  });

  it('demasiada deuda: el resultado dice cuánto te pasas del mínimo', async () => {
    const user = userEvent.setup();
    render(<WaccGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: '0,77' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Más deuda' }));
    await user.click(screen.getByRole('button', { name: /^Proponer un 60\s%/ }));
    expect(screen.getByTestId('wg-reveal')).toHaveTextContent('1,70 puntos por encima');
  });
});
