import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BlockTradeGame } from '../src/features/games/BlockTradeGame';

describe('La compra grande (interfaz)', () => {
  it('trocear en dos rondas antes de la noticia: completa el paquete con nota máxima y devuelve las cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<BlockTradeGame seed={7} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'La compra grande' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Libro de órdenes/ })).toBeInTheDocument();
    expect(screen.getByTestId('bt-round')).toHaveTextContent(
      'Ronda 1 de 4 · resultados dentro de 2 rondas',
    );

    await user.click(screen.getByRole('button', { name: '300' }));
    await user.click(screen.getByRole('button', { name: 'Comprar 300 a mercado' }));
    expect(screen.getByTestId('bt-status')).toHaveTextContent('Comprado 300 de 600');
    expect(screen.getByTestId('bt-message')).toHaveTextContent('Compradas 300');
    expect(screen.getByTestId('bt-round')).toHaveTextContent(
      'Ronda 2 de 4 · resultados dentro de 1 ronda',
    );

    await user.click(screen.getByRole('button', { name: 'Lo que queda (300)' }));
    await user.click(screen.getByRole('button', { name: 'Comprar 300 a mercado' }));
    expect(await screen.findByTestId('bt-done')).toBeInTheDocument();
    expect(screen.getByTestId('bt-verdict')).toHaveTextContent('Muy bien');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    const values = onDone.mock.calls[0]![0];
    expect(Object.keys(values).sort()).toEqual(['avg', 'cost', 'impact', 'mid', 'qty', 'spread']);
    expect(values.qty).toBe(600);
    expect(values.impact).toBeGreaterThan(0);
  });

  it('esperar hasta la noticia: el libro sube y la nota baja', async () => {
    const user = userEvent.setup();
    render(<BlockTradeGame seed={7} onDone={() => {}} />);
    const wait = screen.getByRole('button', { name: 'Esperar a la siguiente ronda' });
    await user.click(wait);
    await user.click(wait);
    expect(screen.getByTestId('bt-message')).toHaveTextContent('Resultados mejores de lo esperado');
    expect(screen.getByTestId('bt-round')).toHaveTextContent('resultados publicados');
    await user.click(screen.getByRole('button', { name: 'Lo que queda (600)' }));
    await user.click(screen.getByRole('button', { name: 'Comprar 600 a mercado' }));
    expect(screen.getByTestId('bt-verdict')).toHaveTextContent('Esperar a la noticia');
  });

  it('limitada sin vendedores: queda pendiente y se avisa', async () => {
    const user = userEvent.setup();
    render(<BlockTradeGame seed={7} onDone={() => {}} />);
    const select = screen.getByRole('combobox', { name: /Precio máximo/ });
    await user.selectOptions(select, (select as HTMLSelectElement).options[0]!.value); // mejor precio de compra: nadie vende ahí
    await user.click(screen.getByRole('button', { name: 'Limitada' }));
    expect(screen.getByTestId('bt-message')).toHaveTextContent('no ha encontrado vendedores');
    expect(screen.getByText(/Limitada pendiente: 200 acciones/)).toBeInTheDocument();
  });
});
