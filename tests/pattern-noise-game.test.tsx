import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PatternNoiseGame } from '../src/features/games/PatternNoiseGame';

describe('¿Patrón o ruido? (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<PatternNoiseGame seed={0} onDone={onDone} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
    await user.click(screen.getByRole('radio', { name: 'No se distinguen a simple vista' }));
    expect(screen.getByTestId('pn-why')).toHaveTextContent('paseo aleatorio');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^3\s%$/ }));
    expect(screen.getByTestId('pn-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(
      screen.getByRole('radio', {
        name: 'Comprar Naranjas del Turia y vender en corto Pirineo Energía',
      }),
    );
    expect(screen.getByTestId('pn-why')).toHaveTextContent('2009');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^800\s€$/ }));
    expect(screen.getByTestId('pn-why')).toHaveTextContent('40 %');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('pn-verdict')).toHaveTextContent('Análisis impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ net: 3, loss: 800, hits: 4 });
  });

  it('un fallo se marca: el bruto no es lo que ganó', async () => {
    const user = userEvent.setup();
    render(<PatternNoiseGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: 'La serie A' }));
    expect(screen.getByTestId('pn-why')).toHaveTextContent('✗');
  });
});
