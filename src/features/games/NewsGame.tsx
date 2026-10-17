import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { createHitStop } from '../../engine/hit-stop';
import { judgeRound, newsRounds, type Headline, type NewsAnswer } from '../../engine/games/news';
import { t } from '../../i18n';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { CandleReveal } from './CandleReveal';
import {
  Deadline,
  Glow,
  HandPointer,
  ParticleCanvas,
  PopLayer,
  shake,
  usePops,
  type ParticleHandle,
} from './kit';

interface Props {
  seed: number;
  pool: Headline[];
  untimed: boolean;
  tutorial: boolean;
  onFinish: (answers: NewsAnswer[]) => void;
}

const THINK_MS = 20000;
const pct = (c: { open: number; close: number }) =>
  `${((c.close / c.open - 1) * 100).toFixed(1).replace('.', ',')} %`;

/** ¿Sube o baja?: titular ficticio → dirección → motivo → la vela se forma. */
export function NewsGame({ seed, pool, untimed, tutorial, onFinish }: Props) {
  const rounds = useMemo(() => newsRounds(seed, pool), [seed, pool]);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<'direction' | 'motive' | 'reveal'>('direction');
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [motive, setMotive] = useState<number | null>(null);
  const [formed, setFormed] = useState(false);
  const [glow, setGlow] = useState(0);
  const answers = useRef<NewsAnswer[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const hitStop = useRef(createHitStop());
  const { pops, pop } = usePops();
  const round = rounds[index]!;
  const h = round.headline;
  const hint = tutorial && index === 0;

  const reveal = (d: 'up' | 'down' | null, mo: number | null) => {
    const a: NewsAnswer = { direction: d, motive: mo };
    answers.current[index] = a;
    setDirection(d);
    setMotive(mo);
    setFormed(false);
    setStage('reveal');
    const j = judgeRound(round, a);
    if (j.double) {
      // acierto doble: pequeña congelación antes del premio, partículas y glow
      hitStop.current.freeze(performance.now(), 60);
      window.setTimeout(() => {
        setGlow((g) => g + 1);
        playSound('combo');
        haptic(HAPTIC.record);
        particles.current?.burst(box.current ? box.current.clientWidth / 2 : 100, 140, index + 1);
        pop(t('games.news.double'), 'up', 50, 30);
      }, 60);
    } else if (j.directionOk || j.motiveOk) {
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('games.news.half'), 'up', 50, 30);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  const next = () => {
    if (index + 1 >= rounds.length) return onFinish(answers.current);
    setIndex(index + 1);
    setStage('direction');
    setDirection(null);
    setMotive(null);
  };

  const j = stage === 'reveal' ? judgeRound(round, { direction, motive }) : null;
  const rightPos = round.motiveOrder.indexOf(h.answer);

  return (
    <div ref={box} className="relative grid gap-4">
      <p data-num className="text-text-2 text-sm">
        {t('games.news.round', { n: index + 1, total: rounds.length })}
      </p>
      <Glow pulse={glow} className="rounded-[var(--radius-md)]">
        <article className="border-line bg-surface-2 grid gap-1 rounded-[var(--radius-md)] border-y-2 p-4">
          <p className="text-text-2 text-xs tracking-widest uppercase">{t('games.news.paper')}</p>
          <h2 className="text-2xl leading-tight" data-testid="headline">
            {h.text}
          </h2>
        </article>
      </Glow>
      <PopLayer pops={pops} />
      <ParticleCanvas ref={particles} />
      {stage !== 'reveal' && (
        <Deadline
          ms={THINK_MS}
          resetKey={`${index}:${stage}`}
          active={!untimed}
          onExpire={() => reveal(direction, null)}
        />
      )}
      {hint && stage === 'direction' && (
        <p className="text-text-2 text-sm">{t('games.news.tutorial')}</p>
      )}
      {stage === 'direction' && (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label={t('games.news.direction')}>
          {(['up', 'down'] as const).map((d) => (
            <div key={d} className="relative">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setDirection(d);
                  setStage('motive');
                }}
              >
                {d === 'up' ? `▲ ${t('games.news.up')}` : `▼ ${t('games.news.down')}`}
              </Button>
              {hint && h.direction === d && <HandPointer className="-bottom-6 right-4" />}
            </div>
          ))}
        </div>
      )}
      {stage === 'motive' && (
        <div className="grid gap-2" role="group" aria-label={t('games.news.motive')}>
          <p className="text-text-2 text-sm">{t('games.news.whyPrompt')}</p>
          {round.motiveOrder.map((orig, pos) => (
            <div key={orig} className="relative">
              <Button
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={() => reveal(direction, pos)}
              >
                {h.motives[orig]}
              </Button>
              {hint && pos === rightPos && <HandPointer className="-bottom-6 right-4" />}
            </div>
          ))}
        </div>
      )}
      {stage === 'reveal' && (
        <section aria-label={t('games.news.result')} className="grid gap-3">
          <CandleReveal candle={round.candle} onDone={() => setFormed(true)} />
          <p className="text-center" data-num data-testid="candle-text">
            {round.candle.close >= round.candle.open ? '▲' : '▼'} {pct(round.candle)}
          </p>
          <div hidden={!formed} className="grid gap-2" data-testid="news-result">
            <p role="status" className={j!.double ? 'text-bull' : 'text-text'}>
              {j!.directionOk ? '✓' : '✗'}{' '}
              {t('games.news.directionResult', {
                dir: h.direction === 'up' ? t('games.news.up') : t('games.news.down'),
              })}
              {' · '}
              {j!.motiveOk ? '✓' : '✗'} {t('games.news.motiveResult')}
            </p>
            <p className="text-text-2 text-sm">
              {!j!.motiveOk && <strong>{h.motives[h.answer]} </strong>}
              {h.explanation}
            </p>
            <Button onClick={next}>
              {index + 1 >= rounds.length ? t('games.news.finish') : t('games.news.next')}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
