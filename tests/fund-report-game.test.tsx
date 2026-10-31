import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FundReportGame } from '../src/features/games/FundReportGame';

describe('El informe del gestor (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<FundReportGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^9,97\s%$/ }));
    expect(screen.getByTestId('fr-why')).toHaveTextContent('TWR');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^4,51\s%$/ }));
    expect(screen.getByTestId('fr-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('img')).toHaveAccessibleName(/\+3, \+2, −1/);
    await user.click(screen.getByRole('radio', { name: /^7,89\s%$/ }));
    expect(screen.getByTestId('fr-why')).toHaveTextContent('peor mes');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^0,80$/ }));
    expect(screen.getByTestId('fr-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('fr-verdict')).toHaveTextContent('Informe impecable');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      twr: 9.97,
      mwr: 4.51,
      max_dd: 7.89,
      sharpe: 0.8,
      hits: 4,
    });
  });

  it('un fallo se marca: sumar los semestres no es la rentabilidad del año', async () => {
    const user = userEvent.setup();
    render(<FundReportGame seed={0} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^10,41\s%$/ }));
    expect(screen.getByTestId('fr-why')).toHaveTextContent('✗');
  });
});
