import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CurveGame } from '../src/features/games/CurveGame';

describe('Curva de tipos (interfaz)', () => {
  it('los tres retos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<CurveGame seed={0} onDone={onDone} />);
    expect(screen.getByText('Bono a 1 año')).toBeInTheDocument();
    expect(screen.getByTestId('cg-price-5')).toHaveTextContent('100,00 (0,00');
    for (let i = 0; i < 4; i++)
      await user.click(screen.getByRole('button', { name: 'Subir todos los tipos' }));
    expect(screen.getByTestId('cg-price-30')).toHaveTextContent('▼ 83,90');
    await user.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente reto' }));
    for (let i = 0; i < 4; i++)
      await user.click(screen.getByRole('button', { name: 'Aplanar la curva' }));
    await user.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente reto' }));
    await user.click(screen.getByRole('radio', { name: /^Un 8,0/ }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('cg-verdict')).toHaveTextContent('Dominas');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      fall_10: 8,
      first_level: 1,
      second_slope: -1,
    });
  });
});
