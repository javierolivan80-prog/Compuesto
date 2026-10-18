import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupDetective } from '../src/engine/games/ratio-detective';
import { RatioGame } from '../src/features/games/RatioGame';

describe('¿Quién es quién? (interfaz)', () => {
  it('acertar las cinco sin pedir ratios: nota máxima y cifras DuPont para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const s = setupDetective(4);
    render(<RatioGame seed={4} onDone={onDone} />);
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
    const selects = screen.getAllByRole('combobox');
    for (const [i, c] of s.cards.entries()) await user.selectOptions(selects[i]!, c);
    await user.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByTestId('rg-result')).toHaveTextContent('5 de 5');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('rg-verdict')).toHaveTextContent('Perfecto');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ year: 2025, hits: 5, nar_roe: 19.08 });
  });

  it('pedir un ratio lo enseña en las cinco tarjetas; repetir empresa impide comprobar', async () => {
    const user = userEvent.setup();
    render(<RatioGame seed={4} onDone={() => {}} />);
    expect(screen.queryAllByText('Días de cobro')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /^Pedir otro ratio: Días de cobro/ }));
    expect(screen.getAllByText('Días de cobro')).toHaveLength(5);
    const selects = screen.getAllByRole('combobox');
    for (const sel of selects) await user.selectOptions(sel, 'naranjas-del-turia');
    expect(screen.getByText(/la misma empresa en dos tarjetas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
  });
});
