import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RiskGame } from '../src/features/games/RiskGame';

describe('La prima de riesgo (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<RiskGame seed={0} onDone={onDone} />);
    expect(screen.getByTestId('rg-inflation')).toHaveTextContent('3,4 % → 3,2 % ▼');
    await user.click(screen.getByRole('radio', { name: 'Desaceleración' }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^Las defensivas/ }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^85\s?pb$/ }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^103,8/ }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('rg-verdict')).toHaveTextContent('Lectura redonda');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      spread_bp: 85,
      debt_ratio1: 103.8,
      hits: 4,
    });
  });

  it('un fallo se marca y la prima al revés lleva signo menos', async () => {
    const user = userEvent.setup();
    render(<RiskGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: 'Recesión' }));
    expect(screen.getByTestId('rg-why')).toHaveTextContent('✗');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^Las cíclicas/ }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('radio', { name: /^−85/ })).toBeInTheDocument();
  });
});
