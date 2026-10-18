import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  applyEntry,
  balanceResult,
  balanceValues,
  classified,
  classify,
  ITEMS,
  OPENING,
  post,
  setupBalance,
  SIDE_OF,
  startBalance,
  TO_CLASSIFY,
  totals,
  type Balance,
  type Entry,
  type ItemId,
  type Side,
} from '../../engine/games/balance-builder';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './balance-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

const SIDES: readonly Side[] = ['activo', 'pasivo', 'patrimonio'];
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${formatNumber(Math.abs(n))}`;
const entryText = (e: Entry) =>
  (Object.entries(e) as [ItemId, number][])
    .map(([k, v]) => `${t(`balanceGame.item.${k}`)} ${signed(v)}`)
    .join(' · ');

/** El balance en dos columnas: activo frente a pasivo y patrimonio neto, con los totales y si cuadra. */
function Sheet({
  balance,
  shown,
  changed,
  complete,
}: {
  balance: Balance;
  shown: ReadonlySet<ItemId>;
  changed: ReadonlySet<ItemId>;
  /** Están todas las partidas: solo entonces se dice si cuadra. */
  complete: boolean;
}) {
  const visible = (side: Side) => ITEMS.filter((i) => SIDE_OF[i] === side && shown.has(i));
  const sum = (ids: ItemId[]) => ids.reduce((s, i) => s + balance[i], 0);
  const left = visible('activo');
  const right = [...visible('patrimonio'), ...visible('pasivo')];
  const a = sum(left);
  const p = sum(right);
  const max = Math.max(a, p, 1);
  const row = (i: ItemId) => (
    <div
      key={i}
      className={`bb-row flex items-baseline justify-between gap-3 rounded-[6px] px-1 ${changed.has(i) ? 'bb-flash' : ''}`}
      data-testid={`bb-${i}`}
    >
      <dt className="min-w-0">{t(`balanceGame.item.${i}`)}</dt>
      <dd className="whitespace-nowrap" data-num>
        {formatNumber(balance[i])}
      </dd>
    </div>
  );
  return (
    <section aria-label={t('balanceGame.sheet')} className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
        <div className="bb-col grid content-start gap-1 rounded-[var(--radius-sm)] border p-3">
          <h3 className="text-lg">{t('balanceGame.activo')}</h3>
          <dl className="grid gap-1">{left.map(row)}</dl>
          <p className="border-line flex justify-between gap-3 border-t pt-1 font-medium">
            <span>{t('balanceGame.total')}</span>
            <span data-num data-testid="bb-total-a">
              {formatNumber(a)}
            </span>
          </p>
        </div>
        <div className="bb-col grid content-start gap-1 rounded-[var(--radius-sm)] border p-3">
          <h3 className="text-lg">{t('balanceGame.pasivoPn')}</h3>
          <dl className="grid gap-1">{right.map(row)}</dl>
          <p className="border-line flex justify-between gap-3 border-t pt-1 font-medium">
            <span>{t('balanceGame.total')}</span>
            <span data-num data-testid="bb-total-p">
              {formatNumber(p)}
            </span>
          </p>
        </div>
      </div>
      <div className="grid gap-1" aria-hidden="true">
        <span className="bb-track h-2 rounded-full">
          <span
            className="bb-bar bb-bar-a block h-full rounded-full"
            style={{ transform: `scaleX(${a / max})` }}
          />
        </span>
        <span className="bb-track h-2 rounded-full">
          <span
            className="bb-bar bb-bar-p block h-full rounded-full"
            style={{ transform: `scaleX(${p / max})` }}
          />
        </span>
      </div>
      <p
        role="status"
        className={complete && a === p ? 'text-bull' : 'text-text-2'}
        data-testid="bb-check"
      >
        {!complete
          ? t('balanceGame.placing', { n: shown.size, total: TO_CLASSIFY.length })
          : a === p
            ? t('balanceGame.balanced', { total: formatNumber(a) })
            : t('balanceGame.pending', { diff: formatNumber(Math.abs(a - p)) })}
      </p>
    </section>
  );
}

export function BalanceGame({ seed, onDone }: Props) {
  const setup = useMemo(() => setupBalance(seed), [seed]);
  const [s, setS] = useState(() => startBalance(setup));
  const [lastSide, setLastSide] = useState<{ id: ItemId; side: Side } | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [changed, setChanged] = useState<ReadonlySet<ItemId>>(new Set());
  const [done, setDone] = useState(false);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((n) => n + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('balanceGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  const placed = new Set<ItemId>(setup.order.slice(0, s.sides.length));
  const shown = classified(s) ? new Set<ItemId>(ITEMS) : placed;
  const opIndex = answered === null ? s.picks.length : s.picks.length - 1;
  const op = setup.ops[opIndex];

  const onClassify = (side: Side) => {
    const id = setup.order[s.sides.length]!;
    setS(classify(s, side));
    setLastSide({ id, side });
    setChanged(new Set([id]));
    feedback(SIDE_OF[id] === side);
  };

  const onPost = (i: number) => {
    const current = setup.ops[s.picks.length]!;
    setS(post(s, i));
    setAnswered(i);
    setChanged(new Set(Object.keys(current.options[current.right]!) as ItemId[]));
    feedback(i === current.right);
  };

  if (done) {
    const r = balanceResult(s);
    return (
      <section
        aria-labelledby="bb-done"
        className="bb-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="bb-done"
      >
        <h2 id="bb-done" className="text-3xl">
          {t('balanceGame.doneTitle')}
        </h2>
        <p className="text-text-2 text-sm">{t('balanceGame.units')}</p>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('balanceGame.totalFromTo')}</dt>
            <dd className="text-xl" data-num>
              {formatNumber(r.totalStart)} → {formatNumber(r.totalEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('balanceGame.item.caja')}</dt>
            <dd className="text-xl" data-num>
              {formatNumber(OPENING.caja)} → {formatNumber(r.cashEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('balanceGame.equity')}</dt>
            <dd className="text-xl" data-num>
              {formatNumber(r.equityStart)} → {formatNumber(r.equityEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('balanceGame.item.resultado')}</dt>
            <dd className="text-bull text-xl" data-num data-testid="bb-result">
              ▲ {signed(r.result)}
            </dd>
          </div>
          <div className="col-span-full">
            <dt className="text-text-2 text-sm">{t('balanceGame.hits')}</dt>
            <dd className="text-lg" data-testid="bb-hits">
              {t('balanceGame.hitsValue', {
                a: r.classifyHits,
                na: setup.order.length,
                b: r.postHits,
                nb: setup.ops.length,
              })}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="bb-verdict">
          {r.score >= 1
            ? t('balanceGame.great')
            : r.score >= 0.6
              ? t('balanceGame.ok')
              : t('balanceGame.bad')}
        </p>
        <Button onClick={() => onDone(balanceValues(r))}>{t('balanceGame.debrief')}</Button>
      </section>
    );
  }

  const nextItem = setup.order[s.sides.length];
  return (
    <section
      ref={box}
      aria-labelledby="bb-title"
      className="bb-panel relative grid gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="bb-title" className="text-3xl">
          {t('balanceGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="bb-step">
          {classified(s)
            ? t('balanceGame.stepOps', { n: opIndex + 1, total: setup.ops.length })
            : t('balanceGame.stepClassify', { n: s.sides.length + 1, total: setup.order.length })}
        </p>
      </header>
      <PopLayer pops={pops} />

      {!classified(s) && nextItem && (
        <div className="grid gap-3">
          {s.sides.length === 0 && <p>{t('balanceGame.brief')}</p>}
          {lastSide && (
            <p
              role="status"
              className={SIDE_OF[lastSide.id] === lastSide.side ? 'text-bull' : 'text-bear'}
            >
              {SIDE_OF[lastSide.id] === lastSide.side ? '✓ ' : '✗ '}
              {t(`balanceGame.why.${lastSide.id}`)}
            </p>
          )}
          <Glow pulse={glow} className="rounded-[var(--radius-md)]">
            <article className="bb-card grid gap-1 rounded-[var(--radius-md)] border p-4 text-center">
              <h3 className="text-2xl leading-tight" data-testid="bb-item">
                {t(`balanceGame.item.${nextItem}`)}
              </h3>
              <p className="text-xl" data-num>
                {formatNumber(OPENING[nextItem])}
              </p>
            </article>
          </Glow>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="group"
            aria-label={t('balanceGame.where')}
          >
            {SIDES.map((side) => (
              <Button key={side} variant="secondary" onClick={() => onClassify(side)}>
                {t(`balanceGame.side.${side}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {classified(s) && op && (
        <div className="grid gap-3">
          {s.picks.length === 0 && answered === null && lastSide && (
            <p role="status" className="text-bull">
              {t('balanceGame.classified', { total: formatNumber(totals(OPENING).activo) })}
            </p>
          )}
          <article className="border-line bg-surface-2 grid gap-1 rounded-[var(--radius-md)] border-y-2 p-4">
            <p className="text-text-2 text-xs tracking-widest uppercase">
              {t('balanceGame.january')}
            </p>
            <h3 className="text-xl leading-snug" data-testid="bb-op">
              {t(`balanceGame.op.${op.id}`, {
                amount: formatNumber(op.amount),
                cost: formatNumber(op.cost ?? 0),
              })}
            </h3>
          </article>
          {answered === null ? (
            <div className="grid gap-2" role="group" aria-label={t('balanceGame.whichEntry')}>
              {op.options.map((e, i) => (
                <Button
                  key={i}
                  variant="secondary"
                  className="justify-start text-left"
                  onClick={() => onPost(i)}
                >
                  <span data-num className="[overflow-wrap:anywhere]">
                    {entryText(e)}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              <p role="status" className={answered === op.right ? 'text-bull' : 'text-bear'}>
                {answered === op.right
                  ? '✓ '
                  : totals(applyEntry(OPENING, op.options[answered]!)).diff !== 0
                    ? `✗ ${t('balanceGame.unbalanced')} `
                    : `✗ ${t('balanceGame.wrongButBalanced')} `}
                {t(`balanceGame.opWhy.${op.id}`, {
                  margin: formatNumber(op.amount - (op.cost ?? 0)),
                })}
              </p>
              {answered !== op.right && (
                <p className="text-sm" data-num>
                  {t('balanceGame.rightEntry', { entry: entryText(op.options[op.right]!) })}
                </p>
              )}
              <Button
                onClick={() => {
                  setAnswered(null);
                  setChanged(new Set());
                  if (s.picks.length >= setup.ops.length) setDone(true);
                }}
              >
                {s.picks.length >= setup.ops.length
                  ? t('balanceGame.summary')
                  : t('balanceGame.next')}
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="text-text-2 text-xs">{t('balanceGame.units')}</p>
      <Sheet balance={s.balance} shown={shown} changed={changed} complete={classified(s)} />
    </section>
  );
}
