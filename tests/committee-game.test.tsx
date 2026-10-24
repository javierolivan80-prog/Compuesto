import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommitteeGame } from '../src/features/games/CommitteeGame';

describe('Comité de riesgos (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<CommitteeGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^9\smil\s€$/ }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Pedir la garantía' }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Fase 2' }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^19,2\smil\s€$/ }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('cg-verdict')).toHaveTextContent('Comité impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ el: 9, stage: 2, provision: 19.2, hits: 4 });
  });

  it('un fallo se marca: conceder sin cubrir la pérdida esperada', async () => {
    const user = userEvent.setup();
    render(<CommitteeGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^20\smil\s€$/ }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✗');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: 'Concederlo' }));
    expect(screen.getByTestId('cg-why')).toHaveTextContent('✗');
  });
});
