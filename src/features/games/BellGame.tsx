import { m } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import { comboPoints, comboStep, initialCombo } from '../../engine/game-kit';
import { fallMs, type BellAnswer, type BellCard } from '../../engine/games/bell';
import { t } from '../../i18n';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { usePrefersReducedMotion } from '../../lib/reduced-motion';
import {
  BackgroundTicker,
  ComboMeter,
  Glow,
  HandPointer,
  ParticleCanvas,
  PopLayer,
  shake,
  usePops,
  type ParticleHandle,
  type TickerCell,
} from './kit';

interface Props {
  cards: BellCard[];
  untimed: boolean;
  tutorial: boolean;
  ticker: TickerCell[];
  onFinish: (answers: BellAnswer[]) => void;
}

const LEAVE_MS = 220;
const BASE_POINTS = 10;

/** Campana de apertura: la tarjeta cae; verdadero a la derecha, falso a la izquierda, antes de que toque el suelo. */
export function BellGame({ cards, untimed, tutorial, ticker, onFinish }: Props) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [combo, setCombo] = useState(initialCombo);
  const [raised, setRaised] = useState(0);
  const [glow, setGlow] = useState(0);
  const [points, setPoints] = useState(0);
  const [status, setStatus] = useState('');
  const [locked, setLocked] = useState(false);
  const answers = useRef<BellAnswer[]>([]);
  const lane = useRef<HTMLDivElement>(null);
  const fall = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const particles = useRef<ParticleHandle>(null);
  const { pops, pop } = usePops();
  const card = cards[index];
  const comboRef = useRef(combo);
  useEffect(() => {
    comboRef.current = combo;
  });

  const resolve = useCallback(
    (value: boolean | null) => {
      if (locked || !card) return;
      setLocked(true);
      anim.current?.cancel();
      answers.current[index] = value;
      const ok = value === card.answer;
      const r = comboStep(comboRef.current, ok);
      setCombo(r.state);
      const x = lane.current ? lane.current.clientWidth / 2 : 120;
      if (ok) {
        const pts = comboPoints(BASE_POINTS, r.state);
        setPoints((p) => p + pts);
        setGlow((g) => g + 1);
        if (r.raised) setRaised((n) => n + 1);
        pop(`+${pts}`, 'up', 40, 30);
        haptic(HAPTIC.success);
        playSound(r.state.multiplier >= 3 && r.raised ? 'combo' : 'hit');
        if (r.state.streak === 5) {
          playSound('open'); // al ×5 suena la campana
          particles.current?.burst(x, 80, index + 1);
        }
        setStatus(t('games.bell.correct'));
      } else {
        haptic(HAPTIC.failure);
        playSound('miss');
        if (stage.current) shake(stage.current);
        if (r.broken) pop(t('games.bell.comboBroken'), 'down', 40, 30);
        setStatus(
          value === null
            ? t('games.bell.missed', { answer: card.answer ? t('games.true') : t('games.false') })
            : t('games.bell.wrong', { answer: card.answer ? t('games.true') : t('games.false') }),
        );
      }
      // la tarjeta sale despedida hacia el lado elegido
      const el = fall.current;
      if (el && !reduced && typeof el.animate === 'function' && value !== null) {
        el.animate(
          [
            { transform: el.style.transform || 'translateY(0)', opacity: 1 },
            {
              transform: `${el.style.transform || 'translateY(0)'} translateX(${value ? 140 : -140}%)`,
              opacity: 0,
            },
          ],
          { duration: LEAVE_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
        );
      }
      window.setTimeout(
        () => {
          const next = index + 1;
          if (next >= cards.length) onFinish(answers.current);
          else {
            setIndex(next);
            setLocked(false);
          }
        },
        ok ? LEAVE_MS : 450,
      );
    },
    [card, cards.length, index, locked, onFinish, pop, reduced],
  );

  // caída de la tarjeta actual: transform lineal hasta el suelo, a menos que sea modo sin tiempo
  useEffect(() => {
    const el = fall.current;
    const box = lane.current;
    if (!el || !box || untimed) return;
    el.style.transform = 'translateY(0px)';
    const max = Math.max(0, box.clientHeight - el.offsetHeight - 4);
    if (reduced || typeof el.animate !== 'function') {
      // sin movimiento: la tarjeta queda quieta y el tiempo lo marca el temporizador
      const id = window.setTimeout(() => resolve(null), fallMs(comboRef.current.streak));
      return () => window.clearTimeout(id);
    }
    const a = el.animate(
      [{ transform: 'translateY(0px)' }, { transform: `translateY(${max}px)` }],
      { duration: fallMs(comboRef.current.streak), easing: 'linear', fill: 'forwards' },
    );
    anim.current = a;
    a.onfinish = () => resolve(null);
    return () => {
      a.onfinish = null;
      a.cancel();
    };
    // la caída se reinicia por tarjeta; `resolve` cambia con el estado y no debe reiniciarla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, untimed, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') resolve(true);
      else if (e.key === 'ArrowLeft') resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resolve]);

  if (!card) return null;
  const hint = tutorial && index === 0;
  return (
    <div className="grid gap-3">
      <BackgroundTicker items={ticker} paused={locked} />
      <div className="flex items-center justify-between gap-3">
        <ComboMeter combo={combo} raisedKey={raised} />
        <p data-num className="text-2xl" aria-label={t('games.bell.points')}>
          <AnimatedNumber value={points} />
        </p>
        <p data-num className="text-text-2 text-sm">
          {index + 1}/{cards.length}
        </p>
      </div>
      {hint && <p className="text-text-2 text-sm">{t('games.bell.tutorial')}</p>}
      <div ref={stage} className="relative">
        <Glow pulse={glow} className="rounded-[var(--radius-md)]">
          <div
            ref={lane}
            className="bg-surface-1 border-line relative h-72 overflow-hidden rounded-[var(--radius-md)] border"
          >
            <div ref={fall} className="absolute inset-x-3 top-0" data-testid="bell-card">
              <m.div
                drag={reduced || locked ? false : 'x'}
                dragSnapToOrigin
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80) resolve(true);
                  else if (info.offset.x < -80) resolve(false);
                }}
                className="bg-surface-2 border-line cursor-grab rounded-[var(--radius-sm)] border px-4 py-3 text-lg"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {card.text}
              </m.div>
            </div>
            <div
              className="bg-brand absolute inset-x-0 bottom-0 h-1 opacity-60"
              aria-hidden="true"
            />
          </div>
        </Glow>
        <PopLayer pops={pops} />
        <ParticleCanvas ref={particles} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status} {card.text}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => resolve(false)}
            disabled={locked}
          >
            ← {t('games.false')}
          </Button>
          {hint && !card.answer && <HandPointer className="-bottom-6 right-4" />}
        </div>
        <div className="relative">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => resolve(true)}
            disabled={locked}
          >
            {t('games.true')} →
          </Button>
          {hint && card.answer && <HandPointer className="-bottom-6 right-4" />}
        </div>
      </div>
    </div>
  );
}
