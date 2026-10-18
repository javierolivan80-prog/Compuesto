import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { bestPlan, setupCash } from '../src/engine/games/cash-cycle';
import { CashGame } from '../src/features/games/CashGame';

const pick = (name: RegExp) => screen.getByRole('radio', { name });

describe('Ciclo de caja (interfaz)', () => {
  it('el mejor plan: no se queda sin caja, nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const best = bestPlan(setupCash(2));
    render(<CashGame seed={2} onDone={onDone} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await user.click(pick(new RegExp(`^${best.dso} días`)));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(pick(new RegExp(`^${best.dio} días`)));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(pick(new RegExp(`^${best.dpo} días`)));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(pick(/^Póliza de crédito/));
    await user.click(screen.getByRole('button', { name: 'Cerrar el plan y ver el año' }));
    expect(screen.getByTestId('cg-outcome')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('cg-verdict')).toHaveTextContent('Plan redondo');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({ nof: best.nof, margin: best.margin, ccc: 75 });
  });

  it('el plan de siempre con póliza deja a Naranjas sin caja y obliga a rehacerlo', async () => {
    const user = userEvent.setup();
    render(<CashGame seed={2} onDone={() => {}} />);
    for (const re of [
      /^60 días: lo que pide/,
      /^60 días: lo habitual/,
      /^60 días: sin descuento/,
    ]) {
      await user.click(pick(re));
      await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    }
    await user.click(pick(/^Póliza de crédito/));
    await user.click(screen.getByRole('button', { name: 'Cerrar el plan y ver el año' }));
    expect(screen.getByTestId('cg-outcome')).toHaveTextContent('la caja llega a cero');
    await user.click(screen.getByRole('button', { name: 'Rehacer el plan' }));
    expect(screen.getByTestId('cg-step')).toHaveTextContent('Paso 1 de 4');
  });
});
