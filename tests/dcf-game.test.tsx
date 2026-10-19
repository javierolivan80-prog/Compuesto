import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DcfGame } from '../src/features/games/DcfGame';

const slide = (name: RegExp, v: number) =>
  fireEvent.change(screen.getByRole('slider', { name }), { target: { value: String(v) } });

describe('DCF Express (interfaz)', () => {
  it('los tres retos bien: WACC implícito, g del jefe sin defenderla y caso base aprobado', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<DcfGame seed={0} onDone={onDone} />);
    expect(screen.getByTestId('dg-value')).toHaveTextContent('9,3');
    slide(/^WACC/, 9.9);
    expect(screen.getByTestId('dg-value')).toHaveTextContent('7,50');
    await user.click(screen.getByRole('button', { name: /^Proponer un WACC/ }));
    expect(screen.getByTestId('dg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente reto' }));

    slide(/^Crecimiento/, 3.7);
    await user.click(screen.getByRole('button', { name: /^Proponer g/ }));
    await user.click(screen.getByRole('radio', { name: /^No:/ }));
    expect(screen.getByTestId('dg-defend')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente reto' }));

    expect(screen.getByTestId('dg-stamp')).not.toHaveClass('is-on');
    slide(/^WACC/, 8.3);
    slide(/^Crecimiento/, 2);
    slide(/^Margen/, 0);
    expect(screen.getByTestId('dg-stamp')).toHaveClass('is-on');
    await user.click(screen.getByRole('button', { name: 'Presentar al comité' }));
    expect(screen.getByTestId('dg-verdict')).toHaveTextContent('impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ wacc_implied: 9.9, g_boss: 3.7 });
  });

  it('los botones −/+ son alternativa al deslizador', async () => {
    const user = userEvent.setup();
    render(<DcfGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Subir el WACC' }));
    expect(screen.getByRole('slider', { name: /^WACC/ })).toHaveValue('8.4');
  });
});
