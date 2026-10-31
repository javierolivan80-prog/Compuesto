import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StopTradeGame } from '../src/features/games/StopTradeGame';

describe('El trader con stop (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<StopTradeGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: '100 acciones' }));
    expect(screen.getByTestId('st-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^33,3\s%$/ }));
    expect(screen.getByTestId('st-why')).toHaveTextContent('valor esperado');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('img')).toHaveAccessibleName(/Stop en 19,00/);
    await user.click(screen.getByRole('radio', { name: /^24\s€$/ }));
    expect(screen.getByTestId('st-why')).toHaveTextContent('sesión 30');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('st-news')).not.toBeEmptyDOMElement();
    await user.click(screen.getByRole('radio', { name: 'Lo mantengo donde lo puse' }));
    expect(screen.getByTestId('st-why')).toHaveTextContent('efecto disposición');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('st-verdict')).toHaveTextContent('Operación de manual');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ shares: 100, result: 24, hits: 4 });
  });

  it('un fallo se marca: comprar con todo el capital no es el tamaño de posición', async () => {
    const user = userEvent.setup();
    render(<StopTradeGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: '500 acciones' }));
    expect(screen.getByTestId('st-why')).toHaveTextContent('✗');
  });
});
