import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IpoGame } from '../src/features/games/IpoGame';

describe('La salida a bolsa (interfaz)', () => {
  it('folleto → libro → precio no cubierto pide otro → precio óptimo → estreno y cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<IpoGame seed={1} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'La salida a bolsa' })).toBeInTheDocument();
    expect(screen.getByText(/OPS: acciones nuevas/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir el libro de demanda' }));
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    // a 10,50 € no se cubre: el juego pide otro precio
    await user.click(screen.getByRole('radio', { name: /^10,50/ }));
    await user.click(screen.getByRole('button', { name: /^Fijar el precio en 10,50/ }));
    expect(screen.getByTestId('ipo-failed')).toHaveTextContent('no se cubre');
    await user.click(screen.getByRole('radio', { name: /^10,00/ }));
    expect(screen.getByTestId('ipo-live')).toHaveTextContent('1,94 veces');
    await user.click(screen.getByRole('button', { name: /^Fijar el precio en 10,00/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Buen estreno');
    expect(screen.getByTestId('ipo-close')).toHaveTextContent('10,09');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('ipo-verdict')).toHaveTextContent('Muy bien');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ price: 10, ops_cash: 30_000_000, family: 65 });
  });

  it('precio bajo: el estreno se dispara y se deja dinero en la mesa', async () => {
    const user = userEvent.setup();
    render(<IpoGame seed={1} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Abrir el libro de demanda' }));
    await user.click(screen.getByRole('radio', { name: /^9,00/ }));
    await user.click(screen.getByRole('button', { name: /^Fijar el precio en 9,00/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('dinero en la mesa');
  });
});
