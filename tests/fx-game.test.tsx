import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FxGame } from '../src/features/games/FxGame';

describe('El viaje del dólar (interfaz)', () => {
  it('los tres pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<FxGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^11\.000/ }));
    expect(screen.getByTestId('xg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^Menos/ }));
    expect(screen.getByTestId('xg-why')).toHaveTextContent('10.083');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^La cubierta/ }));
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('xg-verdict')).toHaveTextContent('Dominas');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ usd: 11000, eur_end: 10083, hits: 3 });
  });
});
