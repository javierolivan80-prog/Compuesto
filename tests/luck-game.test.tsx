import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LuckGame } from '../src/features/games/LuckGame';

describe('¿Suerte o habilidad? (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<LuckGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^0,50/ }));
    expect(screen.getByTestId('lg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'El fondo B' }));
    expect(screen.getByTestId('lg-why')).toHaveTextContent('3,42');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^Más a menudo/ }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^No:/ }));
    expect(screen.getByTestId('lg-why')).toHaveTextContent('ilusión de control');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('lg-verdict')).toHaveTextContent('Impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ mean_a: 0.5, sd_b: 3.42, hits: 4 });
  });
});
