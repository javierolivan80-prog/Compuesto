import { useMemo, useRef, useState } from 'react';
import { Avatar, CHARACTERS } from '../../brand/Characters';
import { Button } from '../../components/Button';
import {
  EXTRA,
  MY_SHARES,
  setupTakeover,
  takeoverResult,
  takeoverValues,
  type FinalMove,
} from '../../engine/games/takeover-rumor';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { CandleReveal } from './CandleReveal';
import { Glow, PopLayer, shake, usePops } from './kit';
import './takeover-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'rumor' | 'insider' | 'offer' | 'done';

const pct = (from: number, to: number) => {
  const v = (to / from - 1) * 100;
  return `${v >= 0 ? '▲\u00a0+' : '▼\u00a0−'}${formatNumber(Math.abs(v), 1)}\u00a0%`;
};

function Bubble({ who, children }: { who: 'rival' | 'compliance'; children: string }) {
  return (
    <figure className="tk-bubble grid grid-cols-[auto_1fr] items-start gap-3 rounded-[var(--radius-md)] border p-3">
      <Avatar character={who} size={44} />
      <div className="grid gap-1">
        <figcaption className="text-text-2 text-xs">
          {CHARACTERS[who].name} · {CHARACTERS[who].role}
        </figcaption>
        <blockquote>{children}</blockquote>
      </div>
    </figure>
  );
}

export function TakeoverGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupTakeover(seed), [seed]);
  const [step, setStep] = useState<Step>('rumor');
  const [buyOnRumor, setBuyOnRumor] = useState<boolean | null>(null);
  const [reportInsider, setReportInsider] = useState<boolean | null>(null);
  const [final, setFinal] = useState<FinalMove | null>(null);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const r = takeoverResult(s, {
    buyOnRumor: !!buyOnRumor,
    reportInsider: !!reportInsider,
    final: final ?? 'accept',
  });
  const rumorCandle = useMemo(
    () => ({ open: s.p0, close: s.pRumor, high: s.pRumor * 1.004, low: s.p0 * 0.997 }),
    [s],
  );
  const offerCandle = useMemo(
    () => ({ open: s.pRumor, close: s.pAfter, high: s.pAfter * 1.003, low: s.pRumor * 0.998 }),
    [s],
  );

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((n) => n + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('takeover.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  if (step === 'done')
    return (
      <section
        aria-labelledby="tk-done"
        className="tk-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="tk-done"
      >
        <h2 id="tk-done" className="text-3xl">
          {t('takeover.doneTitle')}
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('takeover.before')}</dt>
            <dd className="text-xl" data-num>
              {formatEur(s.p0)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('takeover.offerPrice')}</dt>
            <dd className="text-xl" data-num>
              {formatEur(s.offer)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('takeover.premium')}</dt>
            <dd className="text-bull text-xl" data-num>
              ▲&nbsp;+{formatNumber(r.premium, 2)}&nbsp;%
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">
              {t('takeover.yourGain', { n: formatNumber(MY_SHARES) })}
            </dt>
            <dd className="text-xl" data-num data-testid="tk-gain">
              {final === 'reject'
                ? '—'
                : `+${formatEur(final === 'sell' ? r.gainSell : r.gainAccept)}`}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="tk-verdict">
          {r.score >= 1
            ? t('takeover.great')
            : reportInsider
              ? t('takeover.okReject')
              : t('takeover.bad')}
        </p>
        <Button onClick={() => onDone(takeoverValues(r))}>{t('takeover.debrief')}</Button>
      </section>
    );

  return (
    <section
      ref={box}
      aria-labelledby="tk-title"
      className="tk-panel relative grid gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="tk-title" className="text-3xl">
          {t('takeover.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="tk-step">
          {t(`takeover.day.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'rumor' && (
        <div className="grid gap-3">
          <p>{t('takeover.brief', { n: formatNumber(MY_SHARES), price: formatEur(s.p0) })}</p>
          <article className="border-line bg-surface-2 grid gap-1 rounded-[var(--radius-md)] border-y-2 p-4">
            <p className="text-text-2 text-xs tracking-widest uppercase">{t('takeover.paper')}</p>
            <h3 className="text-2xl leading-tight">{t('takeover.rumor')}</h3>
          </article>
          <div className="justify-self-center">
            <CandleReveal candle={rumorCandle} />
          </div>
          <p className="text-center text-xl" data-num>
            {formatEur(s.pRumor)} <span className="text-bull">{pct(s.p0, s.pRumor)}</span>
          </p>
          {buyOnRumor === null ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => setBuyOnRumor(true)}>
                {t('takeover.buyRumor', { n: formatNumber(EXTRA) })}
              </Button>
              <Button variant="secondary" onClick={() => setBuyOnRumor(false)}>
                {t('takeover.waitRumor')}
              </Button>
            </div>
          ) : (
            <>
              <p role="status" data-testid="tk-rumor-note">
                {t(buyOnRumor ? 'takeover.rumorBought' : 'takeover.rumorWaited', {
                  n: formatNumber(EXTRA),
                  rumor: formatEur(s.pRumor),
                  price: formatEur(s.pFalse),
                  loss: formatEur(r.falseLoss),
                })}
              </p>
              <Button onClick={() => setStep('insider')}>{t('takeover.next')}</Button>
            </>
          )}
        </div>
      )}

      {step === 'insider' && (
        <div className="grid gap-3">
          <Bubble who="rival">{t('takeover.tip')}</Bubble>
          {reportInsider === null ? (
            <div className="grid gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setReportInsider(false);
                  feedback(false);
                }}
              >
                {t('takeover.buyTip', { n: formatNumber(EXTRA) })}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setReportInsider(true);
                  feedback(true);
                }}
              >
                {t('takeover.report')}
              </Button>
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <Bubble who="compliance">
                  {t(reportInsider ? 'takeover.complianceOk' : 'takeover.complianceKo')}
                </Bubble>
                <p role="status" className={reportInsider ? 'text-bull' : 'text-bear'}>
                  {reportInsider ? '✓ ' : '✗ '}
                  {t(reportInsider ? 'takeover.insiderRight' : 'takeover.insiderWrong')}
                </p>
                <Button onClick={() => setStep('offer')}>{t('takeover.next')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}

      {step === 'offer' && (
        <div className="grid gap-3">
          <article className="border-line bg-surface-2 grid gap-1 rounded-[var(--radius-md)] border-y-2 p-4">
            <p className="text-text-2 text-xs tracking-widest uppercase">
              {t('takeover.official')}
            </p>
            <h3 className="text-2xl leading-tight">
              {t('takeover.announce', { price: formatEur(s.offer) })}
            </h3>
          </article>
          <div className="justify-self-center">
            <CandleReveal candle={offerCandle} />
          </div>
          <p className="text-center text-xl" data-num data-testid="tk-after">
            {formatEur(s.pAfter)} <span className="text-bull">{pct(s.pRumor, s.pAfter)}</span>
          </p>
          <p>
            {t('takeover.spreadNote', {
              after: formatEur(s.pAfter),
              offer: formatEur(s.offer),
              spread: formatNumber(r.spread, 2),
            })}
          </p>
          {final === null ? (
            <div className="grid gap-2" role="group" aria-label={t('takeover.finalGroup')}>
              {(['sell', 'accept', 'reject'] as const).map((m) => (
                <Button key={m} variant="secondary" onClick={() => setFinal(m)}>
                  {t(`takeover.final.${m}`, {
                    after: formatEur(s.pAfter),
                    offer: formatEur(s.offer),
                  })}
                </Button>
              ))}
            </div>
          ) : (
            <>
              <p role="status" data-testid="tk-final">
                {t(`takeover.finalWhy.${final}`)}
              </p>
              <Button onClick={() => setStep('done')}>{t('takeover.summary')}</Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
