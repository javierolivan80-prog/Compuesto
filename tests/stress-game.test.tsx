import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StressGame } from '../src/features/games/StressGame';

describe('Stress test (interfaz)', () => {
  it('los cuatro pasos bien: nota máxima y cifras para la lección', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<StressGame seed={0} onDone={onDone} />);
    await user.click(screen.getByRole('radio', { name: /^620\sM€$/ }));
    expect(screen.getByTestId('sg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^13,1\s%$/ }));
    expect(screen.getByTestId('sg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^8,2\s%$/ }));
    expect(screen.getByTestId('sg-why')).toHaveTextContent('por encima del 7');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^166,7\s%$/ }));
    expect(screen.getByTestId('sg-why')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: 'Ver el resumen' }));
    expect(screen.getByTestId('sg-verdict')).toHaveTextContent('Banco bajo control');
    await user.click(screen.getByRole('button', { name: 'Ver qué ha pasado' }));
    expect(onDone.mock.calls[0]![0]).toMatchObject({
      nii: 620,
      cet1_ratio: 13.1,
      stressed_ratio: 8.2,
      lcr: 166.7,
      hits: 4,
    });
  });

  it('el peor caso cae por debajo del 7 % y un fallo se marca', async () => {
    const user = userEvent.setup();
    render(<StressGame seed={244} onDone={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /^720\sM€$/ }));
    expect(screen.getByTestId('sg-why')).toHaveTextContent('✗');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^12,0\s%$/ }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('radio', { name: /^6,9\s%$/ }));
    expect(screen.getByTestId('sg-why')).toHaveTextContent('cae por debajo del 7');
  });
});
