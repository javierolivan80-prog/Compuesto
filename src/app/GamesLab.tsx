import { useRef, useState } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Button } from '../components/Button';
import { Toaster } from '../components/Toaster';
import { comboStep, initialCombo, RATINGS, type Rating } from '../engine/game-kit';
import { createHitStop } from '../engine/hit-stop';
import { marketPath } from '../engine/market';
import {
  anticipate,
  BackgroundTicker,
  ComboMeter,
  GameShell,
  Glow,
  ParticleCanvas,
  PopLayer,
  ResultScreen,
  rewardPop,
  shake,
  usePops,
  type ParticleHandle,
} from '../features/games/kit';
import { haptic, HAPTIC } from '../lib/haptics';
import { playSound, setSoundEnabled, soundEnabled, type SoundId } from '../lib/sound';
import { usePrefersReducedMotion } from '../lib/reduced-motion';

const TICKER = [
  { symbol: 'NAR', price: 41.2, changePct: 1.3 },
  { symbol: 'PIR', price: 77.9, changePct: -0.8 },
  { symbol: 'MED', price: 12.45, changePct: 0.2 },
  { symbol: 'ALB', price: 103.1, changePct: -2.1 },
];
const SOUNDS: SoundId[] = [
  'open',
  'hit',
  'miss',
  'combo',
  'rank',
  'lift',
  'seal',
  'close',
  'register',
];

/** Sección «combo, pops y partículas»: su estado no re-renderiza el resto del laboratorio. */
function ComboSection() {
  const { pops, pop } = usePops();
  const [combo, setCombo] = useState(initialCombo);
  const [raised, setRaised] = useState(0);
  const [glow, setGlow] = useState(0);
  const shakeRef = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const seed = useRef(1);

  const hit = () => {
    const r = comboStep(combo, true);
    setCombo(r.state);
    if (r.raised) {
      setRaised((n) => n + 1);
      playSound('combo');
    } else playSound('hit');
    setGlow((g) => g + 1);
    haptic(HAPTIC.success);
    pop('+120 XP', 'up', 20 + Math.random() * 40, 60);
  };
  const miss = () => {
    const r = comboStep(combo, false);
    setCombo(r.state);
    playSound('miss');
    haptic(HAPTIC.failure);
    if (shakeRef.current) shake(shakeRef.current);
    pop('−3,2 %', 'down', 50, 60);
  };
  return (
    <section aria-labelledby="lab-pop" className="relative grid gap-2">
      <h2 id="lab-pop" className="text-xl">
        Pop de número y medidor de combo
      </h2>
      <div
        ref={shakeRef}
        className="bg-surface-1 border-line relative grid gap-3 rounded-[var(--radius-md)] border p-4"
      >
        <Glow pulse={glow} className="rounded-[var(--radius-md)] p-3">
          <ComboMeter combo={combo} raisedKey={raised} />
        </Glow>
        <PopLayer pops={pops} />
        <ParticleCanvas ref={particles} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={hit}>Acierto</Button>
          <Button variant="danger" onClick={miss}>
            Fallo grave
          </Button>
          <Button
            variant="secondary"
            onClick={(e) => {
              const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              particles.current?.burst(r.width / 2, r.height / 2, seed.current++);
              playSound('register');
              haptic(HAPTIC.record);
            }}
          >
            Récord (partículas)
          </Button>
        </div>
      </div>
    </section>
  );
}

function StopSection() {
  const [amount, setAmount] = useState(1000);
  const [frozen, setFrozen] = useState(false);
  const anticipateRef = useRef<HTMLDivElement>(null);
  const hitStop = useRef(createHitStop());
  const stop = () => {
    hitStop.current.freeze(performance.now(), 60);
    setFrozen(true);
    window.setTimeout(() => setFrozen(hitStop.current.isFrozen(performance.now())), 70);
  };
  return (
    <section aria-labelledby="lab-stop" className="grid gap-2">
      <h2 id="lab-stop" className="text-xl">
        Hit-stop, anticipación y contador
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={stop}>
          Hit-stop 60 ms
        </Button>
        <span data-num data-testid="frozen">
          {frozen ? 'Congelado' : 'Libre'}
        </span>
        <div
          ref={anticipateRef}
          className="bg-surface-2 rounded-[var(--radius-sm)] px-4 py-3"
          data-testid="anticipate-target"
        >
          Resultado
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            if (anticipateRef.current) {
              await anticipate(anticipateRef.current);
              rewardPop(anticipateRef.current);
            }
            setAmount((a) => a + 250);
          }}
        >
          Revelar +250
        </Button>
      </div>
      <p className="text-3xl" data-testid="counter">
        <AnimatedNumber
          value={amount}
          format={(n) => `${Math.round(n).toLocaleString('es-ES')} €`}
        />
      </p>
    </section>
  );
}

function TickerSection() {
  const [paused, setPaused] = useState(false);
  return (
    <section aria-labelledby="lab-ticker" className="grid gap-2">
      <h2 id="lab-ticker" className="text-xl">
        Ticker de fondo
      </h2>
      <BackgroundTicker items={TICKER} paused={paused} />
      <label className="flex min-h-12 items-center gap-2">
        <input
          type="checkbox"
          checked={paused}
          onChange={(e) => setPaused(e.target.checked)}
          className="size-5"
        />
        Pausar (momento clave)
      </label>
    </section>
  );
}

function SoundSection() {
  const [muted, setMuted] = useState(!soundEnabled());
  const [log, setLog] = useState('');
  return (
    <section aria-labelledby="lab-sound" className="grid gap-2">
      <h2 id="lab-sound" className="text-xl">
        Sonido y háptica
      </h2>
      <label className="flex min-h-12 items-center gap-2">
        <input
          type="checkbox"
          checked={muted}
          onChange={(e) => {
            setMuted(e.target.checked);
            setSoundEnabled(!e.target.checked);
          }}
          className="size-5"
        />
        Silenciar
      </label>
      <div className="flex flex-wrap gap-2">
        {SOUNDS.map((s) => (
          <Button
            key={s}
            variant="secondary"
            onClick={() => setLog(playSound(s) ? `Suena: ${s}` : `Sin sonido: ${s}`)}
          >
            {s}
          </Button>
        ))}
      </div>
      <p className="text-text-2 text-sm" role="status">
        {log}
      </p>
    </section>
  );
}

function ShellSection() {
  const [rating, setRating] = useState<Rating>('A');
  const [untimed, setUntimed] = useState(false);
  return (
    <GameShell title="Marco de partida" untimed={untimed} onUntimedChange={setUntimed}>
      <p className="text-text-2" data-testid="untimed">
        Modo sin tiempo: {untimed ? 'activado' : 'desactivado'}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Nota de ejemplo">
        {RATINGS.map((r) => (
          <Button
            key={r}
            variant={r === rating ? 'primary' : 'secondary'}
            aria-pressed={r === rating}
            onClick={() => setRating(r)}
          >
            {r}
          </Button>
        ))}
      </div>
      <ResultScreen
        key={rating}
        rating={rating}
        learned="Diversificar reduce el riesgo sin renunciar por completo a la rentabilidad."
        fact="Has diversificado un 40 % más que ayer."
        record={{ best: 'AA', isNew: false }}
        onAgain={() => undefined}
      />
    </GameShell>
  );
}

/** /games-lab (solo desarrollo): cada pieza del kit de game feel por separado. */
export function GamesLab() {
  const reduced = usePrefersReducedMotion();
  const market = marketPath({ seed: 11, steps: 40 });
  return (
    <main id="contenido" className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-6 p-6">
      <Toaster />
      <h1 className="text-3xl">Kit de juegos · lab</h1>
      <p className="text-text-2 text-sm" data-testid="reduced-state">
        Movimiento reducido del sistema: {reduced ? 'sí' : 'no'}
      </p>
      <ComboSection />
      <StopSection />
      <TickerSection />
      <SoundSection />
      <section aria-labelledby="lab-market" className="grid gap-2">
        <h2 id="lab-market" className="text-xl">
          Motor de mercados (semilla 11)
        </h2>
        <p data-num className="text-text-2 text-sm" data-testid="market">
          {market.prices.length} precios · de {market.prices[0]!.toFixed(2)} a{' '}
          {market.prices.at(-1)!.toFixed(2)} · {market.jumps.length} saltos
        </p>
      </section>
      <ShellSection />
    </main>
  );
}
