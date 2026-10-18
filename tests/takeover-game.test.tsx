import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TakeoverGame } from '../src/features/games/TakeoverGame';

describe('El rumor de OPA (interfaz)', () => {
  it('no operar con la confidencia y acudir a la OPA: nota máxima y cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<TakeoverGame seed={2} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'El rumor de OPA' })).toBeInTheDocument();
    expect(screen.getByText(/Se rumorea que Ebro Capital/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^No hacer nada/ }));
    expect(screen.getByTestId('tk-rumor-note')).toHaveTextContent('un rumor no es un anuncio');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Hugo Ferrer · Becario rival')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^No operar, no contárselo/ }));
    expect(screen.getByText('Pilar Soler · Compliance officer')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('tk-after')).toHaveTextContent('7,45');
    await user.click(screen.getByRole('button', { name: /^Esperar y acudir a la OPA/ }));
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('tk-gain')).toHaveTextContent('1.260,00');
    expect(screen.getByTestId('tk-verdict')).toHaveTextContent('Muy bien');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ offer: 7.56, premium: 20, spread: 1.48 });
  });

  it('comprar con la confidencia: cumplimiento lo para y la nota baja', async () => {
    const user = userEvent.setup();
    render(<TakeoverGame seed={2} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^Comprar 1.000 acciones más por si/ }));
    expect(screen.getByTestId('tk-rumor-note')).toHaveTextContent('perderías');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: /antes del anuncio$/ }));
    expect(screen.getByRole('status')).toHaveTextContent('abuso de mercado');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: /^Vender hoy en bolsa/ }));
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('tk-verdict')).toHaveTextContent(
      'Lo grave fue la información privilegiada',
    );
  });
});
