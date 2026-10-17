import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  ORDER_TYPES,
  orderRequests,
  resolveOrder,
  type OrderChoice,
  type OrderOutcome,
  type OrderType,
} from '../../engine/games/orders';
import { t } from '../../i18n';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import type { Level } from '../../engine/orderbook';
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
  withAuction: boolean;
  untimed: boolean;
  tutorial: boolean;
  onFinish: (choices: (OrderChoice | null)[]) => void;
}

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
const PATIENCE_MS = 18000;

/** Libro de órdenes en dos columnas: compras en verde, ventas en rojo, con barras de profundidad (transform). */
function Book({
  bids,
  asks,
  mark,
}: {
  bids: Level[];
  asks: Level[];
  mark: { side: 'bids' | 'asks'; price: number } | null;
}) {
  const max = Math.max(...bids.map((l) => l.qty), ...asks.map((l) => l.qty));
  const row = (l: Level, side: 'bids' | 'asks') => {
    const marked = mark?.side === side && Math.abs(mark.price - l.price) < 1e-9;
    return (
      <li
        key={`${side}${l.price}`}
        className={`relative flex justify-between gap-2 overflow-hidden rounded-sm px-2 py-1 text-sm ${marked ? 'outline-2 outline-[var(--brand)]' : ''}`}
        data-marked={marked || undefined}
      >
        <span
          className={`absolute inset-0 opacity-25 ${side === 'bids' ? 'bg-bull' : 'bg-bear'}`}
          style={{
            transform: `scaleX(${l.qty / max})`,
            transformOrigin: side === 'bids' ? 'right' : 'left',
          }}
          aria-hidden="true"
        />
        <span data-num className="relative">
          {eur(l.price)}
        </span>
        <span data-num className="text-text-2 relative">
          {l.qty}
        </span>
      </li>
    );
  };
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="book">
      <div>
        <h3 className="text-bull mb-1 text-sm">▲ {t('games.orders.bids')}</h3>
        <ul aria-label={t('games.orders.bids')}>{bids.map((l) => row(l, 'bids'))}</ul>
      </div>
      <div>
        <h3 className="text-bear mb-1 text-sm">▼ {t('games.orders.asks')}</h3>
        <ul aria-label={t('games.orders.asks')}>{asks.map((l) => row(l, 'asks'))}</ul>
      </div>
    </div>
  );
}

/** Mesa de órdenes: cada cliente pide algo distinto; eliges la orden y la lanzas al libro. */
export function OrdersGame({ seed, withAuction, untimed, tutorial, onFinish }: Props) {
  const reqs = useMemo(() => orderRequests(seed, undefined, withAuction), [seed, withAuction]);
  const [index, setIndex] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(false);
  const [outcome, setOutcome] = useState<{ o: OrderOutcome; choice: OrderChoice | null } | null>(
    null,
  );
  const [satisfied, setSatisfied] = useState(0);
  const [glow, setGlow] = useState(0);
  const choices = useRef<(OrderChoice | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const { pops, pop } = usePops();
  const req = reqs[index]!;
  const hint = tutorial && index === 0;
  const types = ORDER_TYPES.filter((x) => withAuction || x !== 'auction');

  const submit = (choice: OrderChoice | null) => {
    choices.current[index] = choice;
    if (!choice) {
      setOutcome({
        o: {
          raw: 0,
          chance: 0,
          executed: false,
          price: null,
          satisfied: false,
          message: t('games.orders.patience'),
          missed: null,
        },
        choice,
      });
      playSound('miss');
      return;
    }
    const o = resolveOrder(req, choice);
    setOutcome({ o, choice });
    if (o.satisfied) {
      setSatisfied((s) => s + 1);
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('games.orders.rating'), 'up', 50, 20);
      if (o.executed)
        particles.current?.burst(box.current ? box.current.clientWidth / 2 : 100, 120, index + 1);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  const choose = (type: OrderType) => {
    if (outcome) return;
    if (type === 'limit' && req.intent === 'cap') setPendingLimit(true);
    else if (type === 'limit')
      submit({ type, limitPrice: req.side === 'buy' ? req.bids[0]!.price : req.asks[0]!.price });
    else submit({ type });
  };

  const next = () => {
    if (index + 1 >= reqs.length) return onFinish(choices.current);
    setIndex(index + 1);
    setOutcome(null);
    setPendingLimit(false);
  };

  const mark =
    outcome?.choice?.type === 'limit' && outcome.choice.limitPrice !== undefined
      ? {
          side: (req.side === 'buy' ? 'bids' : 'asks') as 'bids' | 'asks',
          price: outcome.choice.limitPrice,
        }
      : null;
  const correctType =
    req.intent === 'immediate' ? 'market' : req.intent === 'cap' ? 'limit' : 'auction';

  return (
    <div ref={box} className="relative grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p data-num className="text-text-2 text-sm">
          {t('games.orders.client', { n: index + 1, total: reqs.length })}
        </p>
        <p data-num className="text-sm" aria-label={t('games.orders.satisfiedLabel')}>
          ★ {satisfied}
        </p>
      </div>
      <Glow pulse={glow} className="rounded-[var(--radius-md)]">
        <div className="bg-surface-2 border-line rounded-[var(--radius-md)] border p-4">
          <p className="text-xl" aria-live="polite" data-testid="order-request">
            {req.text}
          </p>
        </div>
      </Glow>
      <Book bids={req.bids} asks={req.asks} mark={mark} />
      <PopLayer pops={pops} />
      <ParticleCanvas ref={particles} />
      {!outcome && (
        <Deadline
          ms={PATIENCE_MS}
          resetKey={index}
          active={!untimed}
          onExpire={() => submit(null)}
        />
      )}
      {hint && !outcome && <p className="text-text-2 text-sm">{t('games.orders.tutorial')}</p>}
      {!outcome && !pendingLimit && (
        <div className="grid gap-2" role="group" aria-label={t('games.orders.choose')}>
          {types.map((type) => (
            <div key={type} className="relative">
              <Button
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={() => choose(type)}
              >
                {t(`games.orders.type.${type}`)}
              </Button>
              {hint && type === correctType && <HandPointer className="-top-3 right-3" />}
            </div>
          ))}
        </div>
      )}
      {!outcome && pendingLimit && (
        <div className="grid gap-2" role="group" aria-label={t('games.orders.price')}>
          <p className="text-text-2 text-sm">{t('games.orders.pickPrice')}</p>
          {req.limitOptions.map((p) => (
            <Button
              key={p}
              variant="secondary"
              className="w-full justify-start"
              onClick={() => submit({ type: 'limit', limitPrice: p })}
            >
              <span data-num>{eur(p)}</span>
            </Button>
          ))}
        </div>
      )}
      {outcome && (
        <section aria-label={t('games.orders.result')} className="grid gap-2">
          <p
            role="status"
            className={outcome.o.satisfied ? 'text-bull' : 'text-bear'}
            data-testid="order-outcome"
          >
            {outcome.o.satisfied ? '✓ ' : '✗ '}
            {outcome.o.message}
          </p>
          {!outcome.o.satisfied && outcome.choice && (
            <p className="text-text-2 text-sm">
              {t('games.orders.right', { type: t(`games.orders.type.${correctType}`) })}
            </p>
          )}
          <Button onClick={next}>
            {index + 1 >= reqs.length ? t('games.orders.finish') : t('games.orders.next')}
          </Button>
        </section>
      )}
    </div>
  );
}
