import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VwapDeskGame } from '../src/features/games/VwapDeskGame';

describe('Contra el VWAP (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<VwapDeskGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^10,106\s€$/ }));
    expect(screen.getByTestId('vw-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^80,0\spb$/ }));
    expect(screen.getByTestId('vw-why')).toHaveTextContent('−25,7');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^1\.260\s€$/ }));
    expect(screen.getByTestId('vw-why')).toHaveTextContent('1.008');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'En la subasta de cierre' }));
    expect(screen.getByTestId('vw-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('vw-verdict')).toHaveTextContent('Ejecución impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      vwap: 10.106,
      shortfall_bp: 80,
      explicit: 1260,
      hits: 4,
    });
  });

  it('un fallo se marca: la media simple no es el VWAP', async () => {
    const user = userEvent.setup();
    render(<VwapDeskGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^10,100\s€$/ }));
    expect(screen.getByTestId('vw-why')).toHaveTextContent('✗');
  });
});
