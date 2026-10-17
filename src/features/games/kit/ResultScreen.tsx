import { useEffect, useRef } from 'react';
import { t } from '../../../i18n';
import { Button } from '../../../components/Button';
import type { Rating } from '../../../engine/game-kit';
import { haptic, HAPTIC } from '../../../lib/haptics';
import { playSound } from '../../../lib/sound';
import { rewardPop } from './effects';

interface Props {
  rating: Rating;
  /** Qué has aprendido, en una frase. */
  learned: string;
  /** Dato de tu partida. */
  fact?: string;
  record?: { best: Rating; isNew: boolean };
  onAgain: () => void;
  onExit?: () => void;
}

const TONE: Record<Rating, string> = {
  AAA: 'text-brand',
  AA: 'text-brand',
  A: 'text-bull',
  BBB: 'text-text',
  BB: 'text-text-2',
  B: 'text-text-2',
};

/** Fin de partida: la nota de crédito se «estampa» (1,4 → 1) con un golpe seco; debajo, lo aprendido y tu récord. */
export function ResultScreen({ rating, learned, fact, record, onAgain, onExit }: Props) {
  const stamp = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    playSound('seal');
    haptic(record?.isNew ? HAPTIC.record : HAPTIC.success);
    if (stamp.current) rewardPop(stamp.current);
  }, [record?.isNew]);
  return (
    <section aria-labelledby="res-title" className="grid justify-items-center gap-4 text-center">
      <h2 id="res-title" className="text-text-2 text-lg">
        {t('games.ratingTitle')}
      </h2>
      <p
        ref={stamp}
        data-testid="rating"
        role="img"
        aria-label={t('games.ratingLabel', { rating })}
        className={`kit-stamp text-8xl ${TONE[rating]}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {rating}
      </p>
      <p role="status" className="max-w-prose text-lg">
        {learned}
      </p>
      {fact && <p className="text-text-2 text-sm">{fact}</p>}
      {record && (
        <p className="text-text-2 text-sm" data-num>
          {t(record.isNew ? 'games.newRecord' : 'games.record', { best: record.best })}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={onAgain}>{t('games.again')}</Button>
        {onExit && (
          <Button variant="ghost" onClick={onExit}>
            {t('games.exit')}
          </Button>
        )}
      </div>
    </section>
  );
}
