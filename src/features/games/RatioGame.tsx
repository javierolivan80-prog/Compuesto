import { useId, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  COMPANIES,
  detectiveResult,
  detectiveValues,
  dupontOf,
  RATIOS,
  ratiosOf,
  setupDetective,
  START_RATIOS,
  type CompanyId,
  type RatioId,
} from '../../engine/games/ratio-detective';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './ratio-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const fmt = (id: RatioId, v: number): string => {
  switch (id) {
    case 'ebitMargin':
    case 'roe':
      return `${formatNumber(v, 1)}\u00a0%`;
    case 'fixedShare':
      return `${formatNumber(v)}\u00a0%`;
    case 'assetTurnover':
      return t('ratioGame.times', { v: formatNumber(v, 2) });
    case 'stockDays':
    case 'collectionDays':
      return t('ratioGame.days', { v: formatNumber(v) });
    default:
      return formatNumber(v, 2);
  }
};

export function RatioGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupDetective(seed), [seed]);
  const id = useId();
  const [guesses, setGuesses] = useState<(CompanyId | null)[]>(s.cards.map(() => null));
  const [reveals, setReveals] = useState(0);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const shown = RATIOS.slice(0, START_RATIOS + reveals);
  const complete = guesses.every((g) => g !== null);
  const repeated = new Set(guesses.filter(Boolean)).size < guesses.filter(Boolean).length;
  const r = detectiveResult(s, guesses, reveals);

  const check = () => {
    setChecked(true);
    if (r.hits === s.cards.length) {
      setGlow((g) => g + 1);
      playSound('open');
      haptic(HAPTIC.success);
      pop(t('ratioGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  if (done) {
    const nar = dupontOf('naranjas-del-turia', s.year);
    const tra = dupontOf('tramuntana-retail', s.year);
    const row = (key: string, d: typeof nar) => (
      <div className="grid gap-1">
        <dt className="text-text-2 text-sm">{t(`ratioGame.company.${key}.name`)}</dt>
        <dd className="text-lg" data-num>
          {t('ratioGame.dupontLine', {
            margin: formatNumber(d.margin, 2),
            turnover: formatNumber(d.turnover, 2),
            leverage: formatNumber(d.leverage, 2),
            roe: formatNumber(d.roe, 2),
          })}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="rg-done"
        className="rg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="rg-done"
      >
        <h2 id="rg-done" className="text-3xl">
          {t('ratioGame.doneTitle')}
        </h2>
        <p className="text-lg" data-testid="rg-hits">
          {t('ratioGame.hitsValue', { hits: r.hits, total: s.cards.length, reveals })}
        </p>
        <p>{t('ratioGame.dupontIntro', { year: s.year })}</p>
        <dl className="grid gap-3">
          {row('naranjas-del-turia', nar)}
          {row('tramuntana-retail', tra)}
        </dl>
        <p className="text-lg" data-testid="rg-verdict">
          {r.score >= 0.95
            ? t('ratioGame.great')
            : r.score >= 0.6
              ? t('ratioGame.ok')
              : t('ratioGame.bad')}
        </p>
        <Button onClick={() => onDone(detectiveValues(s, r))}>{t('ratioGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="rg-title"
      className="rg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="rg-title" className="text-3xl">
          {t('ratioGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="rg-step">
          {t(checked ? 'ratioGame.stepChecked' : 'ratioGame.stepPlay', { year: s.year })}
        </p>
      </header>
      <PopLayer pops={pops} />
      {!checked && <p>{t('ratioGame.brief', { year: s.year })}</p>}
      {!checked && (
        <ul className="text-text-2 grid gap-1 text-sm">
          {COMPANIES.map((c) => (
            <li key={c}>
              <span className="text-text font-medium">{t(`ratioGame.company.${c}.name`)}</span>
              {' · '}
              {t(`ratioGame.company.${c}.what`)}
            </li>
          ))}
        </ul>
      )}

      <Glow pulse={glow} className="rounded-[var(--radius-md)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
          {s.cards.map((company, i) => {
            const ratios = ratiosOf(company, s.year);
            const guess = guesses[i] ?? null;
            const ok = checked && guess === company;
            return (
              <article
                key={company}
                className={`rg-card grid content-start gap-2 rounded-[var(--radius-md)] border p-3 ${checked ? (ok ? 'rg-ok' : 'rg-ko') : ''}`}
                data-testid={`rg-card-${LETTERS[i]!}`}
              >
                <h3 className="text-2xl">{t('ratioGame.card', { letter: LETTERS[i]! })}</h3>
                <dl className="grid gap-1 text-sm">
                  {shown.map((k) => (
                    <div key={k} className="flex items-baseline justify-between gap-3">
                      <dt className="min-w-0">{t(`ratioGame.ratio.${k}`)}</dt>
                      <dd className="whitespace-nowrap" data-num>
                        {fmt(k, ratios[k])}
                      </dd>
                    </div>
                  ))}
                </dl>
                {checked ? (
                  <p role="status" className={ok ? 'text-bull' : 'text-bear'}>
                    {ok ? '✓ ' : '✗ '}
                    {t(`ratioGame.company.${company}.name`)}:{' '}
                    {t(`ratioGame.company.${company}.clue`)}
                  </p>
                ) : (
                  <label className="grid gap-1 text-sm" htmlFor={`${id}-${i}`}>
                    {t('ratioGame.who')}
                    <select
                      id={`${id}-${i}`}
                      value={guess ?? ''}
                      onChange={(e) => {
                        const next = [...guesses];
                        next[i] = (e.target.value || null) as CompanyId | null;
                        setGuesses(next);
                      }}
                      className="bg-surface-1 border-line min-h-12 w-full min-w-0 rounded-[var(--radius-sm)] border px-2 text-base"
                    >
                      <option value="">{t('ratioGame.choose')}</option>
                      {COMPANIES.map((c) => (
                        <option key={c} value={c}>
                          {t(`ratioGame.company.${c}.name`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </article>
            );
          })}
        </div>
      </Glow>

      {!checked ? (
        <div className="grid gap-2">
          {repeated && (
            <p role="status" className="text-bear text-sm">
              {t('ratioGame.repeated')}
            </p>
          )}
          <Button
            variant="secondary"
            disabled={shown.length >= RATIOS.length}
            onClick={() => setReveals((n) => n + 1)}
          >
            {shown.length >= RATIOS.length
              ? t('ratioGame.allShown')
              : t('ratioGame.reveal', { ratio: t(`ratioGame.ratio.${RATIOS[shown.length]}`) })}
          </Button>
          <Button disabled={!complete || repeated} onClick={check}>
            {t('ratioGame.check')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <p role="status" data-testid="rg-result">
            {t('ratioGame.result', { hits: r.hits, total: s.cards.length })}
          </p>
          <Button onClick={() => setDone(true)}>{t('ratioGame.summary')}</Button>
        </div>
      )}
    </section>
  );
}
