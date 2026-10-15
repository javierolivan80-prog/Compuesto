import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RouteBoundary } from '../src/components/RouteBoundary';

let broken = true;
function Screen() {
  if (broken) throw new Error('chunk no disponible');
  return <p>Pantalla cargada</p>;
}

describe('RouteBoundary', () => {
  it('muestra un error con reintento cuando una pantalla no carga y se recupera al reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <RouteBoundary>
        <Screen />
      </RouteBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo cargar esta pantalla/);
    broken = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText('Pantalla cargada')).toBeInTheDocument();
  });
});
