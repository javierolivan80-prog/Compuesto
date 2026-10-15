import { m, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Bolsin } from '../brand/Bolsin';
import { dur, ease } from '../design/motion';
import { HAPTIC, haptic } from '../lib/haptics';
import { Button } from './Button';

interface Props {
  result: 'correct' | 'incorrect';
  xp?: number;
  explanation: string;
  onContinue: () => void;
}

/** Hoja de feedback: sube en 220 ms; acierto = check dibujado + "+XP" + háptico 10 ms; fallo = háptico 30 ms. */
export function FeedbackSheet({ result, xp = 10, explanation, onContinue }: Props) {
  const reduced = useReducedMotion();
  const ok = result === 'correct';

  useEffect(() => {
    haptic(ok ? HAPTIC.success : HAPTIC.failure);
  }, [ok]);

  return (
    <m.section
      role="status"
      aria-live="polite"
      initial={reduced ? { opacity: 0 } : { y: 48, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
      transition={{ duration: reduced ? dur.micro : 0.22, ease: ease.out }}
      className={`bg-surface-1 grid gap-3 border-t-2 p-5 ${ok ? 'border-bull' : 'border-bear'}`}
    >
      <div className="flex items-center gap-3">
        <Bolsin state={ok ? 'feliz' : 'animo'} size={56} />
        <div className="grid">
          <strong className={`flex items-center gap-2 text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
            {ok && (
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <m.path
                  d="M4 12.5 L10 18 L20 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, ease: ease.out }}
                />
              </svg>
            )}
            {ok ? 'Correcto' : 'Casi: repásalo'}
          </strong>
          {ok && (
            <m.span
              data-num
              className="text-brand"
              initial={reduced ? false : { y: 0, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { y: -8, opacity: [0, 1, 1] }}
              transition={{ duration: 0.6, ease: ease.out }}
            >
              +{xp} XP
            </m.span>
          )}
        </div>
      </div>
      <p className="text-text-2">{explanation}</p>
      <Button onClick={onContinue} variant={ok ? 'primary' : 'secondary'}>
        Continuar
      </Button>
    </m.section>
  );
}
