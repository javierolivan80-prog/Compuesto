import { animate, useReducedMotion, type AnimationPlaybackControls } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../components/Button';

export interface ExplainerStep {
  title: string;
  text: string;
}

interface Props {
  /** Id estable para las estadísticas (evento explainer_interacted). */
  explainerId: string;
  title: string;
  /** Equivalente textual de la animación, para lector de pantalla (ANIMACIONES §1.6). */
  description: string;
  steps: ExplainerStep[];
  /** Dibuja el estado en el instante t (0–1). `step` es el paso activo. */
  render: (t: number, step: number) => ReactNode;
  durationMs?: number;
  /** Se llama una sola vez, la primera vez que la persona lo manipula. */
  onInteract?: (explainerId: string) => void;
}

export const stepAt = (t: number, n: number) => Math.min(n - 1, Math.floor(t * n));

/**
 * Componente común de los explicadores (ANIMACIONES §2): ▶ reproducir, deslizador para recorrerlo a mano,
 * pasos numerados sincronizados, "Otra vez", estado final estático y descripción textual.
 * Nace en su estado FINAL (t = 1): con reduced-motion no hay nada que esperar; con movimiento,
 * ▶ lo reproduce desde el principio. Con reduced-motion, ▶ avanza un paso cada vez (sin animar).
 */
export function Explainer({
  explainerId,
  title,
  description,
  steps,
  render,
  durationMs = 6000,
  onInteract,
}: Props) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const interacted = useRef(false);
  const sliderId = useId();

  const touch = useCallback(() => {
    if (!interacted.current) {
      interacted.current = true;
      onInteract?.(explainerId);
    }
  }, [explainerId, onInteract]);

  const stop = useCallback(() => {
    controls.current?.stop();
    controls.current = null;
    setPlaying(false);
  }, []);
  useEffect(() => stop, [stop]);

  const playFrom = (from: number) => {
    stop();
    setT(from);
    setPlaying(true);
    controls.current = animate(from, 1, {
      duration: (durationMs / 1000) * (1 - from),
      ease: 'linear',
      onUpdate: setT,
      onComplete: () => {
        controls.current = null;
        setPlaying(false);
      },
    });
  };

  const onPlay = () => {
    touch();
    if (reduced) {
      // paso a paso, sin animación
      const next = stepAt(t, steps.length) + 1;
      setT(next >= steps.length ? 1 / steps.length / 2 : (next + 0.5) / steps.length);
      return;
    }
    if (playing) return stop();
    playFrom(t >= 1 ? 0 : t);
  };

  const step = stepAt(t, steps.length);
  const finished = t >= 1;

  return (
    <figure
      aria-label={title}
      className="bg-surface-1 border-line grid gap-3 rounded-[var(--radius-md)] border p-4"
    >
      <figcaption className="text-xl" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </figcaption>
      <div className="bg-surface-2 rounded-[var(--radius-sm)] p-2" aria-hidden="true">
        {render(t, step)}
      </div>
      <p className="text-text-2 text-sm">{description}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onPlay} aria-pressed={reduced ? undefined : playing}>
          {reduced ? 'Avanzar la animación' : playing ? '⏸ Pausar' : '▶ Reproducir'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            touch();
            if (reduced) setT(0.5 / steps.length);
            else playFrom(0);
          }}
        >
          Otra vez
        </Button>
        {finished && <span className="text-text-2 text-sm">Estado final</span>}
      </div>

      <div className="grid gap-1">
        <label htmlFor={sliderId} className="text-text-2 text-sm">
          Recorrer a mano
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(t * 1000)}
          aria-valuetext={`Paso ${step + 1} de ${steps.length}: ${steps[step]?.title}`}
          onChange={(e) => {
            touch();
            stop();
            setT(Number(e.target.value) / 1000);
          }}
          className="accent-[var(--brand)] h-12 w-full cursor-pointer"
        />
      </div>

      <ol className="grid gap-1 text-sm">
        {steps.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === step ? 'step' : undefined}
            className={`rounded-[var(--radius-sm)] px-3 py-2 ${i === step ? 'bg-surface-2 border-brand border' : 'border border-transparent text-text-2'}`}
          >
            <strong>
              <span data-num>{i + 1}.</span> {s.title}
            </strong>{' '}
            {s.text}
          </li>
        ))}
      </ol>
    </figure>
  );
}
