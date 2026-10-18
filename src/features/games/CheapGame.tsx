import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  cheapResult,
  cheapValues,
  fundamentalsOf,
  meanOf,
  medianOf,
  priceFromEvEbitda,
  priceFromPe,
  rightVerdict,
  setupCheap,
  type CaseAnswer,
  type Verdict,
} from '../../engine/games/cheap-or-dear';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './cheap-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Pick = 'mean' | 'median' | 'low' | 'high';
const PICKS: readonly Pick[] = ['mean', 'median', 'low', 'high'];
const VERDICTS: readonly Verdict[] = ['cheap', 'fair', 'dear'];
const x1 = (v: number) => formatNumber(v, 1);

export function CheapGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupCheap(seed), [seed]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Pick | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [answers, setAnswers] = useState<CaseAnswer[]>([]);
  const [done, setDone] = useState(false);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('cheapGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  if (done) {
    const r = cheapResult(s, answers);
    return (
      <section
        aria-labelledby="cd-done"
        className="cd-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="cd-done"
      >
        <h2 id="cd-done" className="text-3xl">
          {t('cheapGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {s.cases.map((c, k) => (
            <div key={c.id}>
              <dt className="text-text-2 text-sm">{t(`cheapGame.company.${c.id}`)}</dt>
              <dd className="text-lg">
                {t(`cheapGame.verdict.${rightVerdict(c)}`)}
                {answers[k]?.verdict === rightVerdict(c) ? ' ✓' : ' ✗'}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-lg" data-testid="cd-hits">
          {t('cheapGame.hitsValue', {
            median: r.medianHits,
            verdict: r.verdictHits,
            n: s.cases.length,
          })}
        </p>
        <p className="text-lg" data-testid="cd-verdict">
          {r.score >= 1
            ? t('cheapGame.great')
            : r.score >= 0.6
              ? t('cheapGame.ok')
              : t('cheapGame.bad')}
        </p>
        <Button onClick={() => onDone(cheapValues(s, r))}>{t('cheapGame.debrief')}</Button>
      </section>
    );
  }

  const c = s.cases[i]!;
  const f = fundamentalsOf(c.id);
  const pes = c.peers.map((p) => p.pe);
  const evs = c.peers.map((p) => p.evEbitda);
  const values: Record<Pick, number> = {
    mean: meanOf(pes),
    median: medianOf(pes),
    low: Math.min(...pes),
    high: Math.max(...pes),
  };
  const chosenPe = pick ? values[pick] : null;
  const right = rightVerdict(c);
  const valuePe = priceFromPe(c.id, medianOf(pes));
  const valueEv = priceFromEvEbitda(c.id, medianOf(evs));
  const gap = (c.price / valuePe - 1) * 100;
  const last = i === s.cases.length - 1;

  return (
    <section
      ref={box}
      aria-labelledby="cd-title"
      className="cd-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="cd-title" className="text-3xl">
          {t('cheapGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="cd-step">
          {t('cheapGame.stepOf', { n: i + 1, total: s.cases.length })} ·{' '}
          {t(`cheapGame.company.${c.id}`)}
        </p>
      </header>
      <PopLayer pops={pops} />
      {i === 0 && pick === null && <p>{t('cheapGame.brief')}</p>}

      <article className="cd-quote grid gap-1 rounded-[var(--radius-md)] border p-3">
        <p className="text-2xl" data-num data-testid="cd-price">
          {formatEur(c.price)}
        </p>
        <p className="text-text-2 text-sm">
          {t('cheapGame.quote', { eps: formatEur(f.eps), pe: x1(c.price / f.eps) })}
        </p>
      </article>

      <div role="table" aria-label={t('cheapGame.peers')} className="grid gap-1 text-sm" data-num>
        <div role="row" className="text-text-2 grid grid-cols-[minmax(0,1fr)_5rem_6rem] gap-2">
          <span role="columnheader">{t('cheapGame.peer')}</span>
          <span role="columnheader" className="text-right">
            {t('cheapGame.pe')}
          </span>
          <span role="columnheader" className="text-right">
            {t('cheapGame.evEbitda')}
          </span>
        </div>
        {c.peers.map((p, k) => (
          <div
            key={k}
            role="row"
            className="cd-row grid grid-cols-[minmax(0,1fr)_5rem_6rem] gap-2 rounded-[6px] px-1"
          >
            <span role="cell">{t('cheapGame.peerN', { n: k + 1 })}</span>
            <span role="cell" className="text-right">
              {x1(p.pe)}
            </span>
            <span role="cell" className="text-right">
              {x1(p.evEbitda)}
            </span>
          </div>
        ))}
      </div>

      {pick === null ? (
        <div className="grid gap-2">
          <p className="font-medium">{t('cheapGame.askPe')}</p>
          <div role="radiogroup" aria-label={t('cheapGame.askPe')} className="grid gap-2">
            {PICKS.map((p) => (
              <Button
                key={p}
                role="radio"
                aria-checked={false}
                variant="secondary"
                className="justify-start text-left"
                onClick={() => {
                  setPick(p);
                  feedback(p === 'median');
                }}
              >
                {t(`cheapGame.pick.${p}`, { v: x1(values[p]) })}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <Glow pulse={glow} className="rounded-[var(--radius-md)]">
          <div className="grid gap-3 p-1">
            <p role="status" className={pick === 'median' ? 'text-bull' : 'text-bear'}>
              {pick === 'median'
                ? `✓ ${t('cheapGame.medianOk', { v: x1(values.median) })}`
                : `✗ ${t(`cheapGame.pickWhy.${pick}`, { median: x1(values.median), mean: x1(values.mean) })}`}
            </p>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2">
              <div>
                <dt className="text-text-2 text-sm">
                  {t('cheapGame.byPe', { pe: x1(values.median) })}
                </dt>
                <dd className="text-xl" data-num data-testid="cd-value-pe">
                  {formatEur(valuePe)}
                </dd>
              </div>
              <div>
                <dt className="text-text-2 text-sm">
                  {t('cheapGame.byEv', { ev: x1(medianOf(evs)) })}
                </dt>
                <dd className="text-xl" data-num>
                  {formatEur(valueEv)}
                </dd>
              </div>
            </dl>
            {verdict === null ? (
              <div
                role="radiogroup"
                aria-label={t('cheapGame.askVerdict')}
                className="grid gap-2 sm:grid-cols-3"
              >
                {VERDICTS.map((v) => (
                  <Button
                    key={v}
                    role="radio"
                    aria-checked={false}
                    variant="secondary"
                    onClick={() => {
                      setVerdict(v);
                      setAnswers([...answers, { pe: chosenPe!, verdict: v }]);
                      feedback(v === right);
                    }}
                  >
                    {t(`cheapGame.verdict.${v}`)}
                  </Button>
                ))}
              </div>
            ) : (
              <>
                <p
                  role="status"
                  className={verdict === right ? 'text-bull' : 'text-bear'}
                  data-testid="cd-why"
                >
                  {verdict === right ? '✓ ' : '✗ '}
                  {t(`cheapGame.why.${right}`, {
                    price: formatEur(c.price),
                    value: formatEur(valuePe),
                    gap: `${gap >= 0 ? '+' : '−'}${x1(Math.abs(gap))}`,
                  })}
                </p>
                {c.id === 'pirineo-energia' && (
                  <p className="text-text-2 text-sm">{t('cheapGame.debtNote')}</p>
                )}
                <Button
                  onClick={() => {
                    setPick(null);
                    setVerdict(null);
                    if (last) setDone(true);
                    else setI(i + 1);
                  }}
                >
                  {last ? t('cheapGame.summary') : t('cheapGame.next')}
                </Button>
              </>
            )}
          </div>
        </Glow>
      )}
    </section>
  );
}
