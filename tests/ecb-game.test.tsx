import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EcbGame } from '../src/features/games/EcbGame';

describe('La reunión del BCE (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<EcbGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^4,5/ }));
    expect(screen.getByTestId('eg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('eg-surprise')).toHaveTextContent('▲ +25 pb');
    await user.click(screen.getByRole('radio', { name: 'Se aprecia' }));
    expect(screen.getByTestId('eg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^750/ }));
    expect(screen.getByTestId('eg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'El precio sube y la rentabilidad baja' }));
    expect(screen.getByTestId('eg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('eg-verdict')).toHaveTextContent('Reunión redonda');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      taylor: 4.5,
      surprise_bp: 25,
      extra_interest: 750,
      hits: 4,
    });
  });
});
