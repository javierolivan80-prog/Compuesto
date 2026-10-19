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
  it('EvBridge: capitalización + deuda − caja = valor de empresa', () => {
    render(
      <ExplainerBlock
        component="EvBridge"
        props={{ cap: 380000, debt: 102000, cash: 54303, ebitda: 58167 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/427\.697/);
    expect(text).toMatch(/7,4/);
  });
  it('DcfTimeTravel: los flujos descontados más el valor terminal dan el valor de empresa del modelo', () => {
    render(
      <ExplainerBlock
        component="DcfTimeTravel"
        props={{ fcff: [5654.75, 6057, 6460.75, 6858.75, 7246.75], wacc: 8.2713, g: 2 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/26\.369/);
    expect(text).toMatch(/117\.86\d/);
    expect(text).toMatch(/108\.79\d/);
    expect(text).toMatch(/76 %/);
  });
  it('BondSeesaw: sube el tipo, baja el precio; a la par con el tipo igual al cupón', () => {
    render(<ExplainerBlock component="BondSeesaw" props={{ coupon: 4, years: 5 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/al 3,0\s%.*vale 104,58/);
    expect(text).toMatch(/al 4,0\s%.*vale 100,00/);
    expect(text).toMatch(/al 6,0\s%.*vale 91,58/);
  });
  it('Duration: a más plazo, más caída con la misma subida', () => {
    render(<ExplainerBlock component="Duration" props={{ yield: 3, shock: 1 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/2 años cae un 1,9\s%/);
    expect(text).toMatch(/30 años cae un 17,\d\s%/);
  });
  it('TerDrain: la diferencia por comisiones crece con los años', () => {
    render(
      <ExplainerBlock
        component="TerDrain"
        props={{ amount: 10000, gross: 6, terCheap: 0.2, terDear: 1.8 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/30 años/);
    expect(text).toMatch(/8\.113/);
  });
  it('NormalTails: bandas de una y dos desviaciones típicas', () => {
    render(<ExplainerBlock component="NormalTails" props={{ mean: 0.5, sd: 3.4 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/entre [−-]2,9\s% y 3,9\s%/);
    expect(text).toMatch(/entre [−-]6,3\s% y 7,3\s%/);
  });
  it('FxEffect: un euro más fuerte reduce la ganancia en euros', () => {
    render(<ExplainerBlock component="FxEffect" props={{ rate0: 1.1, gain: 10 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/1,20 un año después, en euros: \+0,8\s%/);
    expect(text).toMatch(/1,00 un año después, en euros: \+21,0\s%/);
  });
  it('WaccMix: el WACC baja con algo de deuda y sube con demasiada', () => {
    render(
      <ExplainerBlock
        component="WaccMix"
        props={{ rf: 3.25, erp: 5.5, size: 2, betaU: 0.65, kd0: 4.5, threshold: 30 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/WACC 8,83/);
    expect(text).toMatch(/WACC 8,27/);
    expect(text).toMatch(/WACC 7,90/);
    expect(text).toMatch(/WACC 9,59/);
  });
  it('Leverage: la deuda amplifica el ROE arriba y abajo', () => {
    render(<ExplainerBlock component="Leverage" props={{ goodRoa: 12, badRoa: 2, rate: 5 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/\+33,0/);
    expect(text).toMatch(/−7,0/);
  });
  it('CashCycle: del pago al cobro pasan días de existencias + cobro − pago', () => {
    render(<ExplainerBlock component="CashCycle" props={{ dso: 60, dio: 70, dpo: 50 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/80 días/);
    expect(text).toMatch(/día 130/);
  });
  it('ThreeStatements: el beneficio se apunta al vender y la caja entra al cobrar', () => {
    render(<ExplainerBlock component="ThreeStatements" props={{ sale: 3000, cost: 1860 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/beneficio de 1\.140/);
    expect(text).toMatch(/Flujo de explotación: 0/);
    expect(text).toMatch(/\+3\.000/);
  });
  it('ExDividend explica la caída aproximada del precio y el dividendo cobrado', () => {
    render(<ExplainerBlock component="ExDividend" props={{ price: 10, dividend: 0.2 }} />);
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/9,80/);
    expect(text).toMatch(/0,20/);
  });
  it('StockSplit conserva la capitalización', () => {
    render(
      <ExplainerBlock component="StockSplit" props={{ price: 40, shares: 3_000_000, ratio: 4 }} />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/12\.000\.000 acciones a 10,00/);
    expect(text).toMatch(/120\.000\.000/);
  });
  it('ShareDilution muestra el porcentaje antes, diluido y mantenido', () => {
    render(
      <ExplainerBlock
        component="ShareDilution"
        props={{ shares: 12_000_000, newShares: 3_000_000, holding: 3_600_000 }}
      />,
    );
    const text = screen.getByRole('figure').textContent ?? '';
    expect(text).toMatch(/30,00 %/);
    expect(text).toMatch(/24,00 %/);
  });
});
