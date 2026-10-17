import { m, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { ease, stagger } from '../../design/motion';
import { todayKey } from '../../engine/stats';
import {
  DIVISIONS,
  leagueFromEvents,
  RIVALS,
  type StandingRow,
  type WeekOutcome,
} from '../../engine/rivals';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';

const personalityOf = (id: string) => RIVALS.find((r) => r.id === id)?.personality;

function ZoneTag({ zone }: { zone: StandingRow['zone'] }) {
  if (zone === 'stay') return null;
  const up = zone === 'promote';
  return (
    <span className={up ? 'text-bull' : 'text-bear'} data-num>
      {up ? '▲' : '▼'} {up ? t('rivals.promote') : t('rivals.relegate')}
    </span>
  );
}

function Row({ row, index, animate }: { row: StandingRow; index: number; animate: boolean }) {
  const p = personalityOf(row.id);
  return (
    <m.li
      layout={animate ? 'position' : false}
      transition={{ layout: { duration: 0.4, ease: ease.out, delay: index * stagger } }}
      data-testid={row.me ? 'rival-me' : 'rival-row'}
      className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2 ${
        row.me ? 'border-brand bg-surface-2' : 'border-line bg-surface-1'
      }`}
    >
      <span className="w-6 text-right" data-num>
        {row.rank}
      </span>
      <span className="grid min-w-0 flex-1">
        <span className={row.me ? 'font-semibold' : ''}>{row.me ? t('rivals.you') : row.name}</span>
        {p && <span className="text-text-2 text-xs">{t(`rivals.personality.${p}`)}</span>}
      </span>
      <span className="grid justify-items-end text-sm">
        <span data-num>{t('rivals.xp', { xp: formatNumber(row.xp) })}</span>
        <ZoneTag zone={row.zone} />
      </span>
    </m.li>
  );
}

function Standings({
  rows,
  label,
  animate = false,
}: {
  rows: StandingRow[];
  label: string;
  animate?: boolean;
}) {
  return (
    <ol aria-label={label} className="grid gap-2">
      {rows.map((r, i) => (
        <Row key={r.id} row={r} index={i} animate={animate} />
      ))}
    </ol>
  );
}

/** Cierre semanal: la clasificación del jueves se reordena (FLIP, stagger 40 ms) hasta la final. */
function WeeklyClose({ close, midweek }: { close: WeekOutcome; midweek: StandingRow[] }) {
  const reduced = useReducedMotion();
  const [final, setFinal] = useState(Boolean(reduced));
  useEffect(() => {
    if (reduced || final) return;
    const id = window.setTimeout(() => setFinal(true), 700);
    return () => window.clearTimeout(id);
  }, [final, reduced]);
  const name = DIVISIONS[close.nextDivision]!;
  const key =
    close.result === 'promoted'
      ? 'rivals.closePromoted'
      : close.result === 'relegated'
        ? 'rivals.closeRelegated'
        : 'rivals.closeStayed';
  return (
    <section aria-labelledby="close-title" className="grid gap-3" data-testid="weekly-close">
      <h2 id="close-title" className="text-2xl">
        {t('rivals.closeTitle')}
      </h2>
      <p role="status" data-testid="close-result">
        {t(key, { name, rank: close.myRank, xp: formatNumber(close.myXp) })}
      </p>
      <Standings
        rows={final ? close.standings : midweek}
        label={t('rivals.closeTitle')}
        animate={!reduced}
      />
      <p className="text-text-2 text-sm">{t('rivals.closeNote')}</p>
      {!reduced && (
        <Button variant="secondary" className="justify-self-start" onClick={() => setFinal(false)}>
          {t('rivals.replay')}
        </Button>
      )}
    </section>
  );
}

/** Rivales simulados (CLAUDE.md §3b): liga semanal local contra los becarios de Albufera Partners. */
export function Rivales({ data }: { data: AppData }) {
  const today = todayKey(new Date());
  const league = useMemo(() => leagueFromEvents(data.events, today), [data.events, today]);
  if (data.loading) return <Loading />;
  if (data.error)
    return (
      <ErrorState
        message="no se pudo leer tu progreso en este dispositivo."
        onRetry={data.reload}
      />
    );

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-3xl">{t('rivals.title')}</h1>
        {league.started && (
          <p className="text-text-2" data-num data-testid="division">
            {t('rivals.division', { name: league.divisionName })} ·{' '}
            {t('rivals.weekDay', { n: league.dayIndex })}
          </p>
        )}
      </header>

      {!league.started ? (
        <EmptyState title={t('rivals.title')}>{t('rivals.empty')}</EmptyState>
      ) : (
        <>
          <p className="text-text-2 text-sm">{t('rivals.explain')}</p>
          <section aria-labelledby="stand-title" className="grid gap-3">
            <h2 id="stand-title" className="text-2xl">
              {t('rivals.standings')}
            </h2>
            <Standings
              rows={league.standings}
              label={t('rivals.tableLabel', { division: league.divisionName, week: league.week })}
            />
            {league.division === DIVISIONS.length - 1 && (
              <p className="text-text-2 text-sm">{t('rivals.top')}</p>
            )}
          </section>

          <section aria-labelledby="vs-title" className="grid gap-2" data-testid="vs-last-week">
            <h2 id="vs-title" className="text-2xl">
              {t('rivals.vsTitle')}
            </h2>
            <p>
              {league.vsLastWeek
                ? league.vsLastWeek.delta > 0
                  ? t('rivals.vsAhead', { n: formatNumber(league.vsLastWeek.delta) })
                  : league.vsLastWeek.delta < 0
                    ? t('rivals.vsBehind', { n: formatNumber(-league.vsLastWeek.delta) })
                    : t('rivals.vsEven')
                : t('rivals.vsNone')}
            </p>
          </section>

          {league.lastClose && league.lastCloseMidweek && (
            <WeeklyClose close={league.lastClose} midweek={league.lastCloseMidweek} />
          )}
        </>
      )}
    </div>
  );
}
