import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MacroGame } from '../src/features/games/MacroGame';

describe('El día del dato (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<MacroGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^3,2/ }));
    expect(screen.getByTestId('mg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('mg-surprise')).toHaveTextContent('▲ +0,3');
    await user.click(screen.getByRole('radio', { name: 'Sube' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Está en contracción' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^11,5/ }));
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('mg-verdict')).toHaveTextContent('Mañana redonda');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ cpi_yoy: 3.2, surprise: 0.3, hits: 4 });
  });
});
