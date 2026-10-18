import { useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import {
  BASE_POINTS,
  COMPANIES,
  GUESS_MAX,
  GUESS_MIN,
  GUESS_STEP,
  guessIndex,
  guessScore,
  indexResult,
  indexValues,
  playSessions,
  setupIndex,
  startIndex,
} from '../../engine/games/index-mover';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './index-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

/** Variación con flecha y signo (nunca solo color). */
const signed = (v: number, digits = 1) => {
  const shown = Number(Math.abs(v).toFixed(digits));
  if (shown === 0) return `${formatNumber(0, digits)}\u00a0%`;
  return `${v > 0 ? '▲\u00a0+' : '▼\u00a0−'}${formatNumber(shown, digits)}\u00a0%`;
};
const tone = (v: number) => (v > 0 ? 'text-bull' : v < 0 ? 'text-bear' : '');

export function IndexGame({ seed, onDone }: Props) {
  const setup = useMemo(() => setupIndex(seed), [seed]);
  const out = useMemo(() => playSessions(setup), [setup]);
  const [state, setState] = useState(() => startIndex(setup));
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState(0);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const index = state.guesses.length - (revealed ? 1 : 0);
  const last = index === setup.sessions.length - 1;

  if (state.done && !revealed) {
    const r = indexResult(state);
    return (
      <section
        aria-labelledby="im-done"
        className="im-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="im-done"
      >
        <h2 id="im-done" className="text-3xl">
          {t('indexMover.doneTitle')}
        </h2>
        <dl
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3"
          data-num
        >
          <div>
            <dt className="text-text-2 text-sm">{t('indexMover.points')}</dt>
            <dd className="text-xl">
              {formatNumber(r.start)} → {formatNumber(r.end, 2)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('indexMover.change')}</dt>
            <dd className={`text-xl ${tone(r.pct)}`}>{signed(r.pct, 2)}</dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="im-verdict">
          {t('indexMover.score', { n: r.hits, total: setup.sessions.length })}{' '}
          {r.score >= 0.75
            ? t('indexMover.great')
            : r.score >= 0.4
              ? t('indexMover.ok')
              : t('indexMover.bad')}
        </p>
        <Button onClick={() => onDone(indexValues(r))}>{t('indexMover.debrief')}</Button>
      </section>
    );
  }

  const session = setup.sessions[index]!;
  const o = out[index]!;
  const levelBefore = index === 0 ? BASE_POINTS : out[index - 1]!.level;
  const shownLevel = revealed ? o.level : levelBefore;
  const myGuess = revealed ? state.guesses[index]! : guess;
  const result = revealed ? guessScore(myGuess, o.pct) : null;
  const maxAbs = Math.max(...o.contributions.map(Math.abs), 0.01);
  const order = COMPANIES.map((_, i) => i).sort(
    (a, b) => Math.abs(o.contributions[b]!) - Math.abs(o.contributions[a]!),
  );

  const submit = () => {
    setState(guessIndex(state, guess));
    setRevealed(true);
    const s = guessScore(Math.round(guess * 10) / 10, o.pct);
    if (s === 1) {
      setGlow((n) => n + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('indexMover.hit'), 'up', 50, 20);
    } else if (s === 0) {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  return (
    <section
      ref={box}
      aria-labelledby="im-title"
      className="im-panel relative grid gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="im-title" className="text-3xl">
          {t('indexMover.title')}
        </h2>
        {index === 0 && !revealed && (
          <p>{t('indexMover.brief', { n: formatNumber(BASE_POINTS) })}</p>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3" data-num>
          <p className="text-text-2 text-sm whitespace-nowrap" data-testid="im-round">
            {t('indexMover.round', { n: index + 1, total: setup.sessions.length })}
          </p>
          <p className="text-xl whitespace-nowrap" data-testid="im-level">
            {t('indexMover.indexName')}{' '}
            <AnimatedNumber value={shownLevel} format={(v) => formatNumber(v, 2)} />
          </p>
        </div>
      </header>

      <div role="table" aria-label={t('indexMover.table')} className="grid gap-1" data-num>
        <div role="row" className="text-text-2 grid grid-cols-[3.5rem_1fr_5.5rem] gap-2 text-xs">
          <span role="columnheader">{t('indexMover.company')}</span>
          <span role="columnheader">{t('indexMover.weight')}</span>
          <span role="columnheader" className="text-right">
            {t('indexMover.today')}
          </span>
        </div>
        {COMPANIES.map((c, i) => (
          <div
            role="row"
            key={c.id}
            className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-2 py-0.5"
          >
            <span role="cell">{c.ticker}</span>
            <span role="cell" className="relative">
              <span
                aria-hidden="true"
                className="im-weight absolute inset-y-0 left-0 w-full"
                style={{ transform: `scaleX(${o.weights[i]! / 100})` }}
              />
              <span className="relative">{formatNumber(o.weights[i]!, 1)} %</span>
            </span>
            <span role="cell" className={`text-right ${tone(session.moves[i]!)}`}>
              {signed(session.moves[i]!)}
            </span>
          </div>
        ))}
      </div>

      {!revealed && (
        <div className="grid gap-2">
          <label htmlFor="im-guess" className="text-sm">
            {t('indexMover.ask')}
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label={t('indexMover.less')}
              data-repeat
              onClick={() =>
                setGuess((g) => Math.max(GUESS_MIN, Math.round((g - GUESS_STEP) * 10) / 10))
              }
            >
              −
            </Button>
            <input
              id="im-guess"
              type="range"
              min={GUESS_MIN}
              max={GUESS_MAX}
              step={GUESS_STEP}
              value={guess}
              onChange={(e) => setGuess(Number(e.target.value))}
              aria-valuetext={signed(guess)}
              className="im-range min-h-12 flex-1"
            />
            <Button
              variant="secondary"
              aria-label={t('indexMover.more')}
              data-repeat
              onClick={() =>
                setGuess((g) => Math.min(GUESS_MAX, Math.round((g + GUESS_STEP) * 10) / 10))
              }
            >
              +
            </Button>
          </div>
          <p className={`text-center text-2xl ${tone(guess)}`} data-num data-testid="im-guess">
            {signed(guess)}
          </p>
          <Button onClick={submit}>{t('indexMover.submit')}</Button>
        </div>
      )}

      <PopLayer pops={pops} />
      {revealed && (
        <Glow pulse={glow} className="rounded-[var(--radius-md)]">
          <section aria-label={t('indexMover.result')} className="grid gap-3 p-1">
            <p className="text-xl" data-num data-testid="im-actual">
              {t('indexMover.actual')} <span className={tone(o.pct)}>{signed(o.pct, 2)}</span>
              <span className="text-text-2 block text-base">
                {t('indexMover.yours', { guess: signed(myGuess) })}
              </span>
            </p>
            <p role="status" className={result === 1 ? 'text-bull' : 'text-text'}>
              {result === 1 ? '✓ ' : result === 0.5 ? '≈ ' : '✗ '}
              {t(
                result === 1
                  ? 'indexMover.verdictHit'
                  : result === 0.5
                    ? 'indexMover.verdictClose'
                    : 'indexMover.verdictMiss',
              )}
            </p>
            <div
              role="table"
              aria-label={t('indexMover.contributions')}
              className="grid gap-1"
              data-num
            >
              {order.map((i) => {
                const c = o.contributions[i]!;
                return (
                  <div
                    role="row"
                    key={COMPANIES[i]!.id}
                    className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-2"
                  >
                    <span role="cell">{COMPANIES[i]!.ticker}</span>
                    <span role="cell" className="im-axis relative h-4" aria-hidden="true">
                      <span
                        className={`im-contrib absolute inset-y-0 w-1/2 ${c >= 0 ? 'im-up left-1/2' : 'im-down right-1/2'}`}
                        style={{ transform: `scaleX(${Math.abs(c) / maxAbs})` }}
                      />
                    </span>
                    <span role="cell" className={`text-right ${tone(c)}`}>
                      {Number(Math.abs(c).toFixed(2)) === 0 ? '' : c > 0 ? '+' : '−'}
                      {formatNumber(Math.abs(c), 2)}
                    </span>
                  </div>
                );
              })}
              <p className="text-text-2 text-xs">{t('indexMover.contribNote')}</p>
            </div>
            <p className="text-text-2">{t(`indexMover.why.${session.kind}`)}</p>
            <Button
              onClick={() => {
                setRevealed(false);
                setGuess(0);
              }}
            >
              {last ? t('indexMover.finish') : t('indexMover.next')}
            </Button>
          </section>
        </Glow>
      )}
    </section>
  );
}
