import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialCombo, comboStep } from '../src/engine/game-kit';
import {
  ComboMeter,
  GameShell,
  PopLayer,
  ResultScreen,
  BackgroundTicker,
  usePops,
} from '../src/features/games/kit';
import { shake } from '../src/features/games/kit/effects';

function PopHarness() {
  const { pops, pop } = usePops();
  return (
    <div>
      <button onClick={() => pop('+120 XP', 'up')}>sube</button>
      <button onClick={() => pop('−3,2 %', 'down')}>baja</button>
      <PopLayer pops={pops} />
    </div>
  );
}

describe('kit de juegos', () => {
  it('pop de número: lleva ▲▼ además del color y desaparece a los ~650 ms', async () => {
    vi.useFakeTimers();
    render(<PopHarness />);
    act(() => screen.getByText('sube').click());
    act(() => screen.getByText('baja').click());
    expect(screen.getByText(/▲ \+120 XP/)).toBeInTheDocument();
    expect(screen.getByText(/▼ −3,2 %/)).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(700));
    expect(screen.queryByText(/XP/)).toBeNull();
    vi.useRealTimers();
  });

  it('medidor de combo: anuncia el multiplicador y el progreso de la racha', () => {
    let s = initialCombo();
    for (let i = 0; i < 4; i++) s = comboStep(s, true).state;
    render(<ComboMeter combo={s} raisedKey={2} />);
    expect(screen.getByRole('status')).toHaveTextContent('×3');
    expect(screen.getByRole('status')).toHaveAccessibleName('Combo por 3');
  });

  it('pantalla de resultado: nota estampada, frase aprendida y botón Otra', async () => {
    const onAgain = vi.fn();
    render(
      <ResultScreen
        rating="AA"
        learned="Diversificar reduce el riesgo."
        record={{ best: 'AAA', isNew: false }}
        onAgain={onAgain}
      />,
    );
    expect(screen.getByTestId('rating')).toHaveTextContent('AA');
    expect(screen.getByTestId('rating')).toHaveAccessibleName('Nota AA');
    expect(screen.getByRole('status')).toHaveTextContent('Diversificar reduce el riesgo.');
    expect(screen.getByText('Tu récord: AAA')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Otra' }));
    expect(onAgain).toHaveBeenCalled();
  });

  it('nuevo récord se anuncia como tal', () => {
    render(
      <ResultScreen
        rating="A"
        learned="x"
        record={{ best: 'A', isNew: true }}
        onAgain={() => {}}
      />,
    );
    expect(screen.getByText('Nuevo récord: A')).toBeInTheDocument();
  });

  it('marco de partida: modo sin tiempo accesible y controlado', async () => {
    const onChange = vi.fn();
    render(
      <GameShell title="Mesa de órdenes" untimed={false} onUntimedChange={onChange}>
        <p>tablero</p>
      </GameShell>,
    );
    expect(screen.getByRole('heading', { name: 'Mesa de órdenes' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Sin tiempo' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ticker de fondo: decorativo (oculto a lectores) y se pausa', () => {
    const { container, rerender } = render(
      <BackgroundTicker items={[{ symbol: 'NAR', price: 41.2, changePct: 1.3 }]} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveAttribute('data-paused', 'false');
    rerender(<BackgroundTicker items={[{ symbol: 'NAR', price: 41.2, changePct: 1.3 }]} paused />);
    expect((container.firstElementChild as HTMLElement).dataset['paused']).toBe('true');
  });

  it('sacudida: 180 ms, 2 ciclos, solo transform; sin WAAPI no falla', () => {
    const animate = vi.fn(() => ({}) as Animation);
    const el = { animate } as unknown as HTMLElement;
    shake(el, 5);
    const [frames, opts] = animate.mock.calls[0] as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(opts.duration).toBe(180);
    expect(
      frames.every((f) => Object.keys(f).every((k) => k === 'transform' || k === 'offset')),
    ).toBe(true);
    const xs = frames.map((f) => Number(/(-?[\d.]+)px/.exec(String(f['transform']))?.[1] ?? 0));
    expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(6);
    expect(shake({} as HTMLElement)).toBeNull();
  });
});
