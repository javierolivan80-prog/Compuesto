import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RepoGame } from '../src/features/games/RepoGame';

describe('Una noche en la tesorería (interfaz)', () => {
  it('los tres pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<RepoGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^9,80 millones/ }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^871/ }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'La cédula hipotecaria' }));
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('rg-verdict')).toHaveTextContent('impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ loan: 9.8, interest: 871, hits: 3 });
  });
});
