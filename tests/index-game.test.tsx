import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { playSessions, setupIndex } from '../src/engine/games/index-mover';
import { IndexGame } from '../src/features/games/IndexGame';

describe('¿Quién mueve el índice? (interfaz)', () => {
  it('cuatro sesiones clavando la predicción: aportaciones, nivel del índice y cifras', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const out = playSessions(setupIndex(3));
    render(<IndexGame seed={3} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: '¿Quién mueve el índice?' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /peso y variación de hoy/ })).toBeInTheDocument();
    for (const [i, o] of out.entries()) {
      expect(screen.getByTestId('im-round')).toHaveTextContent(`Sesión ${i + 1} de 4`);
      fireEvent.change(screen.getByLabelText('¿Cuánto se mueve hoy el índice?'), {
        target: { value: String(Math.round(o.pct * 10) / 10) },
      });
      await user.click(screen.getByRole('button', { name: 'Ver el cierre' }));
      expect(screen.getByRole('status')).toHaveTextContent('Clavado');
      expect(screen.getByRole('table', { name: /Lo que aporta cada empresa/ })).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: i === 3 ? 'Ver el resultado' : 'Siguiente sesión' }),
      );
    }
    expect(await screen.findByTestId('im-done')).toBeInTheDocument();
    expect(screen.getByTestId('im-verdict')).toHaveTextContent('Clavaste 4 de 4');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ start: 1000, end: 1007.37, hits: 4 });
  });

  it('los botones − y + mueven la predicción de décima en décima; lejos del resultado se marca el fallo', async () => {
    const user = userEvent.setup();
    render(<IndexGame seed={3} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Subir la predicción una décima' }));
    await user.click(screen.getByRole('button', { name: 'Subir la predicción una décima' }));
    expect(screen.getByTestId('im-guess')).toHaveTextContent('▲ +0,2 %');
    for (let i = 0; i < 25; i++)
      await user.click(screen.getByRole('button', { name: 'Subir la predicción una décima' }));
    expect(screen.getByTestId('im-guess')).toHaveTextContent('▲ +2,7 %');
    await user.click(screen.getByRole('button', { name: 'Ver el cierre' }));
    expect(screen.getByRole('status')).toHaveTextContent('✗');
  });
});
