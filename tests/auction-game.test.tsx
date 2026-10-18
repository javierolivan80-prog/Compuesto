import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { equilibrium, ordersAt830, setupAuction } from '../src/engine/games/opening-auction';
import { AuctionGame } from '../src/features/games/AuctionGame';

describe('La subasta de apertura (interfaz)', () => {
  it('a mercado: llega la orden de las 8:59, suena la campana, compras las 500 y devuelve las cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<AuctionGame seed={1} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'La subasta de apertura' })).toBeInTheDocument();
    expect(screen.getByTestId('oa-clock')).toHaveTextContent('8:30');
    expect(screen.getByRole('table', { name: /Subasta/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'A mercado' }));
    // el indicativo incluye tu orden y dice cuántas comprarías
    expect(screen.getByTestId('oa-indicative')).toHaveTextContent('tú comprarías 500 de 500');
    await user.click(screen.getByRole('button', { name: 'Enviar la orden' }));
    expect(screen.getByTestId('oa-clock')).toHaveTextContent('8:59');
    expect(screen.getByTestId('oa-shock')).toHaveTextContent('8:59: entra una orden de');
    await user.click(screen.getByRole('button', { name: 'Confirmar y esperar a las 9:00' }));

    expect(await screen.findByTestId('oa-done', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('oa-filled')).toHaveTextContent('500 / 500');
    expect(screen.getByTestId('oa-verdict')).toHaveTextContent('Muy bien');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    const v = onDone.mock.calls[0]![0];
    expect(v).toMatchObject({ qty: 500, filled: 500, rest: 0 });
    expect(v.cost).toBeCloseTo(500 * v.auction, 2);
  });

  it('limitada sin tocar en el indicativo de las 8:30: con la compra grande se queda fuera de la subasta', async () => {
    const user = userEvent.setup();
    const s = setupAuction(1);
    expect(s.shock.side).toBe('buy');
    const ind = equilibrium(ordersAt830(s), s.ref).price;
    render(<AuctionGame seed={1} onDone={() => {}} />);
    await user.selectOptions(
      screen.getByLabelText('Precio máximo de tu orden limitada'),
      String(ind),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar la orden' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar y esperar a las 9:00' }));
    expect(await screen.findByTestId('oa-done', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('oa-filled')).toHaveTextContent('0 / 500');
    expect(screen.getByTestId('oa-verdict')).toHaveTextContent('por debajo del precio de apertura');
    expect(screen.getByText(/^500 a \d+,\d{2}/)).toBeInTheDocument(); // todo en el continuo
  });
});
