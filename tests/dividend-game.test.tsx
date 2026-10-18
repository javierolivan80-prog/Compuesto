import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DividendGame } from '../src/features/games/DividendGame';

describe('El primer dividendo (interfaz)', () => {
  it('bróker más barato, sin cazar el dividendo y acertando la fecha ex: nota máxima y cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<DividendGame seed={1} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'El primer dividendo' })).toBeInTheDocument();
    expect(screen.getByTestId('dv-step')).toHaveTextContent('Paso 1 de 5');
    // 600 × 12 € = 7.200 €: los 5 € fijos ganan al 0,10 % (7,20 €)
    await user.click(screen.getByRole('button', { name: /^Fijo Bolsa/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Bien elegido');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText(/dividendo de 0,40/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^No hacer nada/ }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(
      screen.getByRole('button', { name: /^Más o menos el cierre menos el dividendo/ }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('✓');
    expect(screen.getByTestId('dv-ex')).toHaveTextContent('11,72');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText(/Retención del IRPF \(19 %\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pasar un mes y vender' }));
    expect(screen.getByTestId('dv-done')).toBeInTheDocument();
    expect(screen.getByTestId('dv-total')).toHaveTextContent('▲ +5,77 %');
    expect(screen.getByTestId('dv-verdict')).toHaveTextContent('Muy bien');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ n: 600, fee_buy: 5, gross: 240, net: 194.4 });
  });

  it('cazar el dividendo: la fecha ex enseña que solo quedan las comisiones', async () => {
    const user = userEvent.setup();
    render(<DividendGame seed={1} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^Banco del Turia/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Hay otro más barato');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: /^Comprar 300 más/ }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: /^Igual que el cierre/ }));
    expect(await screen.findByTestId('dv-capture')).toHaveTextContent('compensa justo la bajada');
    expect(screen.getByRole('status')).toHaveTextContent('✗');
  });
});
