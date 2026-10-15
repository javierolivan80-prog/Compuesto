import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExplainerBlock } from './index';

describe('explicadores de la Unidad 2 del Nivel 0', () => {
  it('TinVsTae nace en su estado final y describe todas las TAE', () => {
    render(<ExplainerBlock component="TinVsTae" props={{ tin: 12 }} />);
    const fig = screen.getByRole('figure');
    expect(fig).toHaveAccessibleName(/TIN y TAE/);
    expect(fig.textContent).toContain('12,68 %');
    expect(fig.textContent).toContain('12,00 %');
  });
  it('LoanAmortization describe la primera y la última cuota con cifras del cuadro', () => {
    render(
      <ExplainerBlock
        component="LoanAmortization"
        props={{ principal: 100000, rate: 3, years: 20 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/554,60/); // cuota mensual
    expect(text).toMatch(/250,00/); // intereses de la primera cuota
  });
  it('rechaza props fuera de rango en vez de pintar datos falsos', () => {
    render(
      <ExplainerBlock component="LoanAmortization" props={{ principal: 1, rate: 0, years: 20 }} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/no válidos/);
  });
  it('MoneyCreation describe las rondas y el límite del modelo', () => {
    render(
      <ExplainerBlock component="MoneyCreation" props={{ deposit: 1000, reserveRatio: 10 }} />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/10\.000/);
    expect(text).toMatch(/modelo/i);
  });
  it('MarketCapFloat describe la capitalización y el free float', () => {
    render(
      <ExplainerBlock
        component="MarketCapFloat"
        props={{ price: 10, shares: 12_000_000, freeFloat: 40 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/120,0 M/);
    expect(text).toMatch(/48,0 M/);
  });
  it('PrimarySecondary distingue a quién llega el dinero', () => {
    render(
      <ExplainerBlock component="PrimarySecondary" props={{ newShares: 3_000_000, price: 10 }} />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/30\.000\.000/);
    expect(text).toMatch(/recibe 0/);
  });
  it('IndexWeights calcula pesos, aportaciones y rentabilidad del índice', () => {
    render(
      <ExplainerBlock
        component="IndexWeights"
        props={{
          constituents: [
            { name: 'A', cap: 100, returnPct: 10 },
            { name: 'B', cap: 50, returnPct: -10 },
            { name: 'C', cap: 50, returnPct: 0 },
          ],
        }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/\+2,50 %/);
    expect(text).toMatch(/peso 50 %/);
  });
  it('OrderBook describe la horquilla y el precio medio de una compra a mercado', () => {
    render(
      <ExplainerBlock
        component="OrderBook"
        props={{
          asks: [
            { price: 10.02, qty: 300 },
            { price: 10.03, qty: 500 },
          ],
          bids: [
            { price: 10.0, qty: 400 },
            { price: 9.99, qty: 600 },
          ],
          buySize: 600,
        }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/horquilla 0,02/);
    expect(text).toMatch(/precio medio 10,03/);
  });
});
