import { useEffect, useState, type ReactNode } from 'react';
import { t } from '../../../i18n';
import { Button } from '../../../components/Button';
import { playSound } from '../../../lib/sound';

interface Props {
  title: string;
  children: ReactNode;
  /** Modo sin tiempo (accesibilidad): se pasa a la partida para que desactive cuenta atrás y caídas. */
  untimed: boolean;
  onUntimedChange: (v: boolean) => void;
  onExit?: () => void;
}

/** Marco común de una partida (JUEGOS.md §3): entrada de 400 ms en «modo terminal» con título en serif y rejilla. */
export function GameShell({ title, children, untimed, onUntimedChange, onExit }: Props) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    playSound('open');
    const t = window.setTimeout(() => setEntered(true), 400);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section
      aria-labelledby="game-title"
      className="kit-enter bg-bg relative grid gap-4 rounded-[var(--radius-md)] border p-4"
      style={{
        borderColor: 'var(--line)',
        backgroundImage:
          'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        backgroundBlendMode: 'soft-light',
      }}
    >
      <header className="flex items-center justify-between gap-3">
        <h1 id="game-title" className="text-3xl">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex min-h-12 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={untimed}
              onChange={(e) => onUntimedChange(e.target.checked)}
              className="accent-[var(--brand)] size-5"
            />
            {t('games.untimed')}
          </label>
          {onExit && (
            <Button variant="ghost" onClick={onExit}>
              {t('games.exit')}
            </Button>
          )}
        </div>
      </header>
      <div data-entered={entered} className="grid gap-4">
        {children}
      </div>
    </section>
  );
}
