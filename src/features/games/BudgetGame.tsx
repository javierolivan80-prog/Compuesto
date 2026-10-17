import { m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  BUDGET_CATEGORIES,
  BUDGET_ROUNDS,
  balanceOf,
  budgetRound,
  type BudgetCategory,
} from '../../engine/games/budget';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { usePrefersReducedMotion } from '../../lib/reduced-motion';
import { Deadline, Glow, HandPointer, PopLayer, shake, usePops } from './kit';

interface Props {
  seed: number;
  untimed: boolean;
  tutorial: boolean;
  onFinish: (rounds: (BudgetCategory | null)[][]) => void;
}

const eur = (n: number) => `${formatNumber(n)} €`;
/** Tiempo por partida (ms): se acorta en cada ronda. */
const ITEM_MS = [12000, 9000, 7000];
const KEYS: Record<string, BudgetCategory> = { '1': 'ingreso', '2': 'gasto', '3': 'ahorro' };

/** Balanza de latón en línea fina: el brazo se inclina según el balance y se amortigua al recibir peso. */
function Scale({ diff, total }: { diff: number; total: number }) {
  const reduced = usePrefersReducedMotion();
  const angle = total === 0 ? 0 : Math.max(-14, Math.min(14, (diff / total) * 28));
  return (
    <svg
      viewBox="0 0 200 90"
      role="img"
      aria-label={t('games.budget.scale', { diff: eur(Math.abs(diff)) })}
      className="mx-auto w-48"
    >
      <line x1="100" y1="20" x2="100" y2="82" stroke="var(--brand)" strokeWidth="1.5" />
      <line x1="70" y1="82" x2="130" y2="82" stroke="var(--brand)" strokeWidth="1.5" />
      <m.g
        animate={{ rotate: angle }}
        transition={reduced ? { duration: 0.1 } : { type: 'spring', stiffness: 90, damping: 9 }}
        style={{ originX: '100px', originY: '22px', transformBox: 'view-box' }}
      >
        <line x1="30" y1="22" x2="170" y2="22" stroke="var(--brand)" strokeWidth="2" />
        <path d="M30 22 L18 52 H42 Z" fill="none" stroke="var(--brand)" strokeWidth="1.2" />
        <path d="M170 22 L158 52 H182 Z" fill="none" stroke="var(--brand)" strokeWidth="1.2" />
      </m.g>
      <circle cx="100" cy="22" r="3" fill="var(--brand)" />
    </svg>
  );
}

/** Cuadra tu presupuesto: coloca cada partida como ingreso, gasto o ahorro; la balanza cuadra si todo está en su sitio. */
export function BudgetGame({ seed, untimed, tutorial, onFinish }: Props) {
  const [round, setRound] = useState(0);
  const items = budgetRound(seed, round);
  const [placed, setPlaced] = useState<(BudgetCategory | null)[]>([]);
  const [stage, setStage] = useState<'play' | 'review'>('play');
  const all = useRef<(BudgetCategory | null)[][]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState(0);
  const { pops, pop } = usePops();
  const idx = placed.length;
  const item = items[idx];

  const place = (cat: BudgetCategory | null) => {
    if (!item || stage !== 'play') return;
    const ok = cat === item.category;
    setPlaced((p) => [...p, cat]);
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(`+${eur(item.amount)}`, 'up', 50, 40);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
      pop(cat === null ? t('games.budget.late') : `−${eur(item.amount)}`, 'down', 50, 40);
    }
    if (idx + 1 >= items.length) {
      all.current[round] = [...placed, cat];
      setStage('review');
      playSound(balanceOf(items, [...placed, cat]).diff === 0 ? 'lift' : 'miss');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = KEYS[e.key];
      if (c) place(c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const bal = balanceOf(items, placed);
  const total = bal.ingresos + bal.gastos + bal.ahorro;
  const done = stage === 'review';
  const level = Math.min(round, ITEM_MS.length - 1);

  return (
    <div ref={box} className="relative grid gap-4">
      <p data-num className="text-text-2 text-sm">
        {t('games.budget.round', { n: round + 1, total: BUDGET_ROUNDS })} ·{' '}
        {Math.min(idx + 1, items.length)}/{items.length}
      </p>
      <Glow pulse={glow} className="rounded-[var(--radius-md)]">
        <div className="bg-surface-1 border-line grid gap-2 rounded-[var(--radius-md)] border p-4">
          <Scale diff={bal.diff} total={total} />
          <dl className="grid grid-cols-3 gap-2 text-center text-sm" data-num>
            <div>
              <dt className="text-text-2">{t('games.budget.ingreso')}</dt>
              <dd>{eur(bal.ingresos)}</dd>
            </div>
            <div>
              <dt className="text-text-2">{t('games.budget.gasto')}</dt>
              <dd>{eur(bal.gastos)}</dd>
            </div>
            <div>
              <dt className="text-text-2">{t('games.budget.ahorro')}</dt>
              <dd>{eur(bal.ahorro)}</dd>
            </div>
          </dl>
          <p role="status" className="text-center text-sm" data-testid="balance-state">
            {done
              ? bal.diff === 0
                ? `✓ ${t('games.budget.balanced')}`
                : `✗ ${t('games.budget.unbalanced', { diff: eur(Math.abs(bal.diff)) })}`
              : t('games.budget.pending', { diff: eur(Math.abs(bal.diff)) })}
          </p>
        </div>
      </Glow>
      <PopLayer pops={pops} />
      {!done && item && (
        <>
          <Deadline
            ms={ITEM_MS[level]!}
            resetKey={`${round}:${idx}`}
            active={!untimed}
            onExpire={() => place(null)}
          />
          {tutorial && round === 0 && idx === 0 && (
            <p className="text-text-2 text-sm">{t('games.budget.tutorial')}</p>
          )}
          <p
            className="bg-surface-2 border-line rounded-[var(--radius-md)] border p-4 text-xl"
            data-testid="budget-item"
            aria-live="polite"
          >
            {item.label} <strong data-num>{eur(item.amount)}</strong>
          </p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('games.budget.where')}>
            {BUDGET_CATEGORIES.map((c, i) => (
              <div key={c} className="relative">
                <Button variant="secondary" className="w-full" onClick={() => place(c)}>
                  <span data-num className="text-text-2 mr-1">
                    {i + 1}
                  </span>
                  {t(`games.budget.${c}`)}
                </Button>
                {tutorial && round === 0 && idx === 0 && c === item.category && (
                  <HandPointer className="-bottom-6 right-2" />
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {done && (
        <section aria-label={t('games.budget.review')} className="grid gap-2">
          <ul className="grid gap-1 text-sm">
            {items.map((it, i) => {
              const ok = placed[i] === it.category;
              return (
                <li key={it.id} className="flex justify-between gap-3">
                  <span>
                    <span className={ok ? 'text-bull' : 'text-bear'}>{ok ? '✓' : '✗'}</span>{' '}
                    {it.label}
                  </span>
                  <span data-num>
                    {eur(it.amount)} · {t(`games.budget.${it.category}`)}
                  </span>
                </li>
              );
            })}
          </ul>
          <Button
            onClick={() => {
              if (round + 1 >= BUDGET_ROUNDS) onFinish(all.current);
              else {
                setRound(round + 1);
                setPlaced([]);
                setStage('play');
              }
            }}
          >
            {round + 1 >= BUDGET_ROUNDS ? t('games.budget.finish') : t('games.budget.next')}
          </Button>
        </section>
      )}
    </div>
  );
}
