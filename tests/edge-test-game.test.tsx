import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EdgeTestGame } from '../src/features/games/EdgeTestGame';

describe('¿Ventaja real? (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EdgeTestGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^21\s€$/ }));
    expect(screen.getByTestId('et-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^1,60$/ }));
    expect(screen.getByTestId('et-why')).toHaveTextContent('por debajo de 2');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^2$/ }));
    expect(screen.getByTestId('et-why')).toHaveTextContent('multiple testing');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^30,8\s%$/ }));
    expect(screen.getByTestId('et-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('et-verdict')).toHaveTextContent('Comité impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      ev: 21,
      t_stat: 1.6,
      false_pos: 2,
      posterior: 30.8,
      hits: 4,
    });
  });

  it('un fallo se marca: contar solo las ganancias no es el valor esperado', async () => {
    const user = userEvent.setup();
    render(<EdgeTestGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^66\s€$/ }));
    expect(screen.getByTestId('et-why')).toHaveTextContent('✗');
  });
});
