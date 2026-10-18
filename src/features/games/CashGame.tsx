import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  bestPlan,
  cashScore,
  cashValues,
  DIO_OPTIONS,
  DPO_OPTIONS,
  DSO_OPTIONS,
  planResult,
  setupCash,
  type CashPlan,
  type CashResult,
  type Funding,
} from '../../engine/games/cash-cycle';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './cash-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'dso' | 'dio' | 'dpo' | 'funding' | 'outcome' | 'done';
const DEFAULT: CashPlan = { dso: 60, dio: 60, dpo: 50, funding: 'poliza' };
const n = (v: number) => formatNumber(v);

/** Reloj de días: compras el día 0, pagas el día DPO, vendes el día DIO y cobras el día DIO + DSO. */
function Timeline({ r }: { r: CashResult }) {
  const max = 140;
  const x = (d: number) => 8 + (d / max) * 304;
  const sale = r.dio;
  const cash = r.dio + r.dso;
  const gapFrom = Math.min(r.dpo, cash);
  return (
    <figure className="grid gap-1">
      <svg
        viewBox="0 0 320 108"
        className="h-auto w-full"
        role="img"
        aria-label={t('cashGame.timelineAria', { dpo: r.dpo, sale, cash, ccc: r.ccc })}
      >
        <line x1={x(0)} x2={x(max)} y1="60" y2="60" stroke="var(--line)" />
        <rect
          className="cg-gap"
          x={x(0)}
          y="52"
          width={304}
          height="16"
          rx="4"
          style={{
            transform: `translateX(${((gapFrom / max) * 304).toFixed(1)}px) scaleX(${(Math.max(0, cash - gapFrom) / max).toFixed(4)})`,
          }}
        />
        {[
          { d: 0, label: t('cashGame.tl.buy'), y: 20, anchor: 'start' as const },
          // el pago siempre va antes del cobro: su etiqueta, a la izquierda de la marca; la del cobro, a la derecha
          { d: r.dpo, label: t('cashGame.tl.pay', { d: r.dpo }), y: 102, anchor: 'end' as const },
          { d: sale, label: t('cashGame.tl.sell', { d: sale }), y: 20, anchor: 'middle' as const },
          {
            d: cash,
            label: t('cashGame.tl.collect', { d: cash }),
            y: 102,
            anchor: x(cash) + 72 > 312 ? ('end' as const) : ('start' as const),
          },
        ].map((m) => (
          <g
            key={m.label}
            className="cg-mark"
            style={{ transform: `translateX(${x(m.d).toFixed(1)}px)` }}
          >
            <line x1="0" x2="0" y1="30" y2="88" stroke="var(--text-2)" />
            <text x="0" y={m.y} textAnchor={m.anchor} fill="var(--text)" fontSize="11">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="text-text-2 text-sm">
        {t('cashGame.cccCaption', { ccc: r.ccc })}
      </figcaption>
    </figure>
  );
}

/** Lo que necesitas (NOF) frente a lo que tienes: caja disponible y, encima, el límite de la póliza. */
function NeedBar({ r, available, limit }: { r: CashResult; available: number; limit: number }) {
  const max = Math.max(r.nof, available + limit) * 1.08;
  const over = r.nof > available + limit;
  return (
    <div className="grid gap-2">
      <div
        className="cg-track relative h-6 overflow-hidden rounded-[var(--radius-sm)]"
        aria-hidden="true"
      >
        <span
          className="cg-avail absolute inset-y-0 left-0 w-full"
          style={{ transform: `scaleX(${available / max})` }}
        />
        <span
          className="cg-limit absolute inset-y-0 left-0 w-full"
          style={{ transform: `translateX(${(available / max) * 100}%) scaleX(${limit / max})` }}
        />
        <span
          className={`cg-need absolute inset-y-1 left-0 w-full ${over ? 'cg-over' : ''}`}
          style={{ transform: `scaleX(${r.nof / max})` }}
        />
      </div>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2 text-sm">
        <div>
          <dt className="text-text-2">{t('cashGame.nof')}</dt>
          <dd className={`text-lg ${over ? 'text-bear' : ''}`} data-num data-testid="cg-nof">
            {n(r.nof)}
          </dd>
        </div>
        <div>
          <dt className="text-text-2">{t('cashGame.available')}</dt>
          <dd className="text-lg" data-num>
            {n(available)}
          </dd>
        </div>
        <div>
          <dt className="text-text-2">{t('cashGame.limit')}</dt>
          <dd className="text-lg" data-num>
            {n(limit)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function CashGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupCash(seed), [seed]);
  const [step, setStep] = useState<Step>('dso');
  const [plan, setPlan] = useState<CashPlan>(DEFAULT);
  const [picked, setPicked] = useState(false);
  const [failures, setFailures] = useState(0);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const r = planResult(s, plan);
  const best = bestPlan(s);

  const choose = (patch: Partial<CashPlan>) => {
    setPlan({ ...plan, ...patch });
    setPicked(true);
  };
  const next = (to: Step) => {
    setPicked(false);
    setStep(to);
  };
  const finish = () => {
    if (r.feasible) {
      setGlow((g) => g + 1);
      playSound('open');
      haptic(HAPTIC.success);
      pop(t('cashGame.hit'), 'up', 50, 20);
    } else {
      setFailures((f) => f + 1);
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
    next('outcome');
  };
  const afterDpo = () => (r.shortfall > 0 ? next('funding') : finish());
  // un plan que deja a Naranjas sin caja cuenta: si lo rehaces, la nota se queda en la mitad
  const score = Math.round(cashScore(s, r) * (failures > 0 ? 0.5 : 1) * 1000) / 1000;

  const options = <T extends number | string>(
    group: string,
    values: readonly T[],
    current: T,
    key: keyof CashPlan,
    label: (v: T) => string,
  ) => (
    <div role="radiogroup" aria-label={group} className="grid gap-2">
      {values.map((v) => (
        <Button
          key={String(v)}
          role="radio"
          aria-checked={picked && current === v}
          variant={picked && current === v ? 'primary' : 'secondary'}
          className="justify-start text-left"
          onClick={() => choose({ [key]: v } as Partial<CashPlan>)}
        >
          {label(v)}
        </Button>
      ))}
    </div>
  );

  if (step === 'done')
    return (
      <section
        aria-labelledby="cg-done"
        className="cg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="cg-done"
      >
        <h2 id="cg-done" className="text-3xl">
          {t('cashGame.doneTitle')}
        </h2>
        <p className="text-text-2 text-sm">{t('cashGame.units')}</p>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('cashGame.yourPlan')}</dt>
            <dd className="text-lg" data-testid="cg-plan">
              {t('cashGame.planText', { dso: r.dso, dio: r.dio, dpo: r.dpo })}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('cashGame.ccc')}</dt>
            <dd className="text-xl" data-num>
              {t('cashGame.days', { d: r.ccc })}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('cashGame.nof')}</dt>
            <dd className="text-xl" data-num>
              {n(r.nof)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t(`cashGame.fundingCost.${r.funding}`)}</dt>
            <dd className="text-xl" data-num>
              {r.fundingCost > 0 ? `−${n(r.fundingCost)}` : '0'}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('cashGame.margin')}</dt>
            <dd className="text-xl" data-num data-testid="cg-margin">
              {n(r.margin)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('cashGame.best')}</dt>
            <dd className="text-xl" data-num>
              {n(best.margin)}
            </dd>
          </div>
          <div className="col-span-full">
            <dt className="text-text-2 text-sm">{t('cashGame.bestPlan')}</dt>
            <dd className="text-lg">
              {t('cashGame.planText', { dso: best.dso, dio: best.dio, dpo: best.dpo })}
              {' · '}
              {t(`cashGame.fundingName.${best.funding}`)}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="cg-verdict">
          {score >= 1 ? t('cashGame.great') : score >= 0.6 ? t('cashGame.ok') : t('cashGame.bad')}
        </p>
        <Button onClick={() => onDone(cashValues(s, r))}>{t('cashGame.debrief')}</Button>
      </section>
    );

  const stepNo = { dso: 1, dio: 2, dpo: 3, funding: 4, outcome: 4 }[step];
  return (
    <section
      ref={box}
      aria-labelledby="cg-title"
      className="cg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="cg-title" className="text-3xl">
          {t('cashGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="cg-step">
          {t('cashGame.stepOf', { n: stepNo, total: 4 })} · {t(`cashGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'dso' && (
        <div className="grid gap-3">
          {failures === 0 && (
            <p>
              {t('cashGame.brief', {
                sales: n(s.baseSales),
                available: n(s.available),
                limit: n(s.limit),
                rate: s.rate,
              })}
            </p>
          )}
          <p className="font-medium">{t('cashGame.ask.dso')}</p>
          {options(t('cashGame.ask.dso'), DSO_OPTIONS, plan.dso, 'dso', (v) =>
            t(`cashGame.opt.dso.${v}`),
          )}
          <p className="text-text-2 text-sm">{t('cashGame.law')}</p>
          <Button disabled={!picked} onClick={() => next('dio')}>
            {t('cashGame.next')}
          </Button>
        </div>
      )}
      {step === 'dio' && (
        <div className="grid gap-3">
          <p className="font-medium">{t('cashGame.ask.dio')}</p>
          {options(t('cashGame.ask.dio'), DIO_OPTIONS, plan.dio, 'dio', (v) =>
            t(`cashGame.opt.dio.${v}`),
          )}
          <Button disabled={!picked} onClick={() => next('dpo')}>
            {t('cashGame.next')}
          </Button>
        </div>
      )}
      {step === 'dpo' && (
        <div className="grid gap-3">
          <p className="font-medium">{t('cashGame.ask.dpo')}</p>
          {options(t('cashGame.ask.dpo'), DPO_OPTIONS, plan.dpo, 'dpo', (v) =>
            t(`cashGame.opt.dpo.${v}`),
          )}
          <Button disabled={!picked} onClick={afterDpo}>
            {t('cashGame.next')}
          </Button>
        </div>
      )}
      {step === 'funding' && (
        <div className="grid gap-3">
          <p>{t('cashGame.gap', { shortfall: n(r.shortfall), limit: n(s.limit) })}</p>
          {options(
            t('cashGame.ask.funding'),
            ['poliza', 'factoring'] as readonly Funding[],
            plan.funding,
            'funding',
            (v) => t(`cashGame.opt.funding.${v}`, { rate: s.rate, fee: formatNumber(s.fee, 2) }),
          )}
          <Button disabled={!picked} onClick={finish}>
            {t('cashGame.close')}
          </Button>
        </div>
      )}
      {step === 'outcome' && (
        <Glow pulse={glow} className="rounded-[var(--radius-md)]">
          <div className="grid gap-3 p-1">
            <p
              role="status"
              className={r.feasible ? 'text-bull' : 'text-bear'}
              data-testid="cg-outcome"
            >
              {r.feasible
                ? `✓ ${t('cashGame.survived', { shortfall: n(r.shortfall), cost: n(r.fundingCost) })}`
                : `✗ ${t('cashGame.broke', { shortfall: n(r.shortfall), limit: n(s.limit) })}`}
            </p>
            {r.feasible ? (
              <Button onClick={() => next('done')}>{t('cashGame.summary')}</Button>
            ) : (
              <Button
                onClick={() => {
                  setPlan(DEFAULT);
                  next('dso');
                }}
              >
                {t('cashGame.retry')}
              </Button>
            )}
          </div>
        </Glow>
      )}

      <section
        aria-label={t('cashGame.panel')}
        className="cg-sheet grid gap-3 rounded-[var(--radius-sm)] border p-3"
      >
        <p className="text-text-2 text-xs">
          {step === 'dso' && !picked ? t('cashGame.provisional') : t('cashGame.units')}
        </p>
        <Timeline r={r} />
        <NeedBar r={r} available={s.available} limit={s.limit} />
      </section>
    </section>
  );
}
