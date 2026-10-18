import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n';
import { Button } from '../../components/Button';
import { Loading } from '../../components/States';
import { pathLessonMeta } from '../../content/meta';
import { conceptGraph, conceptName, exerciseCatalog, getLesson } from '../../content/library';
import { useRepo } from '../../db/RepoProvider';
import type { AppEvent, BlockSpec } from '../../engine/events';
import { seededShuffle } from '../../engine/grading';
import { dailyMissions } from '../../engine/missions';
import type { Summary } from '../../engine/projections';
import {
  SESSION_MINUTES,
  activeSession,
  planSession,
  weeklyBossAvailable,
  type ActiveSession,
} from '../../engine/session';
import {
  MAX_REVIEW_CARDS,
  buildChallenge,
  buildPractice,
  buildReview,
  conceptMastery,
  dueCards,
  projectCards,
  type ReviewItem,
} from '../../engine/srs';
import { dayKey } from '../../engine/days';
import { availableGames, pickDailyGame } from '../../engine/games/catalog';
import { todayKey } from '../../engine/stats';
import { formatNumber } from '../../lib/format';
import { GameHost } from '../games/GameHost';
import { gameData } from '../games/data';
import { LessonScreen } from '../lesson/LessonScreen';
import { TicketPrint } from '../sequences/TicketPrint';
import { ReviewScreen } from '../practicar/ReviewScreen';

interface Props {
  onExit: () => void;
}

const newId = () => globalThis.crypto.randomUUID();

/** Items de repaso/reto de un bloque, calculados una vez con el estado fresco al llegar al bloque. */
function itemsFor(block: BlockSpec, events: readonly AppEvent[], summary: Summary): ReviewItem[] {
  const today = todayKey(new Date());
  const catalog = exerciseCatalog();
  const cards = projectCards(events);
  const mastery = conceptMastery(events);
  if (block.kind === 'due') {
    return buildReview({ cards, catalog, mastery, graph: conceptGraph(), today }).slice(
      0,
      Math.min(block.cards, MAX_REVIEW_CARDS),
    );
  }
  const answeredToday = new Set(
    events.flatMap((e) =>
      e.type === 'exercise_answered' && dayKey(e.createdAt, e.tz) === today
        ? [e.payload.exerciseId]
        : [],
    ),
  );
  if (block.kind === 'review')
    return buildPractice({
      cards,
      catalog,
      mastery,
      today,
      n: block.exercises,
      exclude: answeredToday,
    });
  if (block.kind === 'reto') {
    const completedLessons = new Set(
      Object.entries(summary.progress.lessons)
        .filter(([, p]) => p.status === 'completed')
        .map(([id]) => id),
    );
    return buildChallenge({
      catalog,
      completedLessons,
      day: today,
      n: block.exercises,
      answeredToday,
      shuffle: seededShuffle,
    });
  }
  return [];
}

/** Sesión "Abrir mercado": bloques en orden fijo, reanudable, que termina en "Objetivo cumplido" sin presionar. */
export function SessionScreen({ onExit }: Props) {
  const repo = useRepo();
  const [ctx, setCtx] = useState<{ events: AppEvent[]; summary: Summary } | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [minutes, setMinutes] = useState<number>(20);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);

  const refresh = async () => {
    const [events, summary] = await Promise.all([repo.allEvents(), repo.summary()]);
    setCtx({ events, summary });
    return { events, summary };
  };

  // estado inicial: ¿hay una sesión de hoy sin cerrar?
  useEffect(() => {
    let alive = true;
    void Promise.all([repo.allEvents(), repo.summary()])
      .then(([events, summary]) => {
        if (!alive) return;
        setCtx({ events, summary });
        const a = activeSession(events, todayKey(new Date()));
        setSession(a);
        if (a) setIndex(a.nextIndex);
        const saved = summary.settings['sessionMinutes'];
        if (typeof saved === 'number' && SESSION_MINUTES.includes(saved as 5)) setMinutes(saved);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (!ctx) return;
    try {
      const today = todayKey(new Date());
      const completed = (id: string) => ctx.summary.progress.lessons[id]?.status === 'completed';
      const catalog = exerciseCatalog();
      const cards = projectCards(ctx.events);
      const due = dueCards(cards, { today, catalog });
      const nextLessons = pathLessonMeta()
        .filter((l) => !completed(l.id))
        .slice(0, 3)
        .map((l) => ({ id: l.id, minutes: l.estimatedMinutes }));
      const reviewable = new Set([...cards.keys()]).size;
      const plan = planSession({
        minutes,
        dueCount: Math.min(due.length, MAX_REVIEW_CARDS),
        nextLessons,
        reviewable,
        weeklyBoss: weeklyBossAvailable(ctx.events, today),
        gameId: pickDailyGame(ctx.events, today, availableGames(gameData(ctx.events).context)),
      });
      const sessionId = newId();
      await repo.record('session_started', { sessionId, day: today, minutes, blocks: plan.blocks });
      await repo.record('settings_changed', { key: 'sessionMinutes', value: minutes });
      await repo.record('session_block_completed', { sessionId, index: 0 });
      const a = activeSession(await repo.allEvents(), today);
      setSession(a);
      setIndex(a?.nextIndex ?? 1);
      await refresh();
    } catch (e) {
      console.error('No se pudo abrir la sesión', e);
      setError(true);
    }
  };

  const complete = async (i: number) => {
    if (!session) return;
    try {
      await repo.record('session_block_completed', { sessionId: session.sessionId, index: i });
    } catch (e) {
      console.error('No se pudo guardar el avance de la sesión', e);
    }
    await refresh().catch(() => undefined);
    setIndex(i + 1);
  };

  if (error)
    return (
      <section className="grid gap-4">
        <p role="alert">{t('session.error')}</p>
        <Button onClick={onExit}>{t('session.backHome')}</Button>
      </section>
    );
  if (!ctx) return <Loading />;

  if (!session) {
    const done = pathLessonMeta().every(
      (l) => ctx.summary.progress.lessons[l.id]?.status === 'completed',
    );
    return (
      <section aria-labelledby="ses-title" className="grid gap-5">
        <h1 id="ses-title" className="text-3xl">
          {t('session.title')}
        </h1>
        <p className="text-text-2">{t('session.intro')}</p>
        <div role="group" aria-label={t('session.duration')} className="flex flex-wrap gap-2">
          {SESSION_MINUTES.map((m) => (
            <Button
              key={m}
              variant={m === minutes ? 'primary' : 'secondary'}
              aria-pressed={m === minutes}
              onClick={() => setMinutes(m)}
            >
              {t('session.minutes', { n: m })}
            </Button>
          ))}
        </div>
        {done && <p className="text-text-2 text-sm">{t('session.allDone')}</p>}
        <div className="flex gap-3">
          <Button onClick={() => void start()}>{t('session.open', { n: minutes })}</Button>
          <Button variant="ghost" onClick={onExit}>
            {t('session.back')}
          </Button>
        </div>
      </section>
    );
  }

  const block = session.blocks[index];
  if (!block || block.kind === 'cierre' || block.kind === 'briefing')
    return (
      <Closing
        session={session}
        index={index}
        ctx={ctx}
        onClose={async () => {
          try {
            await repo.record('session_completed', { sessionId: session.sessionId });
          } catch (e) {
            console.error('No se pudo cerrar la sesión', e);
          }
          onExit();
        }}
        onExit={onExit}
        refresh={refresh}
      />
    );

  return (
    <BlockRunner
      key={`${session.sessionId}:${index}`}
      block={block}
      index={index}
      total={session.blocks.length}
      ctx={ctx}
      onDone={() => void complete(index)}
      onExit={onExit}
    />
  );
}

function BlockRunner({
  block,
  index,
  total,
  ctx,
  onDone,
  onExit,
}: {
  block: BlockSpec;
  index: number;
  total: number;
  ctx: { events: AppEvent[]; summary: Summary };
  onDone: () => void;
  onExit: () => void;
}) {
  // la lista se fija al llegar al bloque: no cambia mientras se responde
  const items = useMemo(
    () => (block.kind === 'lesson' ? [] : itemsFor(block, ctx.events, ctx.summary)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const lesson = block.kind === 'lesson' ? getLesson(block.lessonId) : undefined;
  const skip =
    (block.kind === 'lesson' &&
      (!lesson || ctx.summary.progress.lessons[block.lessonId]?.status === 'completed')) ||
    (block.kind === 'game' &&
      !availableGames(gameData(ctx.events).context).includes(block.gameId)) ||
    (block.kind !== 'lesson' && block.kind !== 'game' && items.length === 0);
  const skipped = useRef(false);
  useEffect(() => {
    if (skip && !skipped.current) {
      skipped.current = true;
      onDone();
    }
  }, [skip, onDone]);
  if (skip) return <Loading />;

  if (block.kind === 'game')
    return (
      <GameHost
        gameId={block.gameId}
        daily
        onExit={onExit}
        onFinished={onDone}
        finishLabel="Siguiente bloque"
      />
    );
  const step = `Paso ${index} de ${total - 1}`;
  if (block.kind === 'lesson' && lesson)
    return (
      <LessonScreen
        lesson={lesson}
        onExit={onExit}
        onFinished={onDone}
        finishLabel="Siguiente bloque"
      />
    );
  const title =
    block.kind === 'due'
      ? 'Due diligence'
      : block.kind === 'review'
        ? 'Repaso'
        : block.kind === 'reto' && block.weekly
          ? 'Encargo del jefe'
          : 'Reto del día';
  return (
    <ReviewScreen
      title={`${title} · ${step}`}
      items={items}
      onExit={onExit}
      onFinish={onDone}
      finishLabel="Siguiente bloque"
    />
  );
}

function Closing({
  session,
  index,
  ctx,
  onClose,
  onExit,
  refresh,
}: {
  session: ActiveSession;
  index: number;
  ctx: { events: AppEvent[]; summary: Summary };
  onClose: () => void;
  onExit: () => void;
  refresh: () => Promise<{ events: AppEvent[]; summary: Summary }>;
}) {
  const [fresh, setFresh] = useState(ctx);
  useEffect(() => {
    void refresh()
      .then(setFresh)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { summary } = fresh;
  const today = todayKey(new Date());
  const missions = dailyMissions(fresh.events, today, summary.dailyGoal.goal);
  const sessionXp = fresh.events
    .filter((e) => e.createdAt >= session.startedAt)
    .reduce(
      (s, e) =>
        s + (e.type === 'exercise_answered' || e.type === 'lesson_completed' ? e.payload.xp : 0),
      0,
    );
  const answered = fresh.events.filter((e) => e.type === 'exercise_answered');
  const accuracyPct = answered.length
    ? Math.round(
        (answered.filter((e) => e.type === 'exercise_answered' && e.payload.correct).length /
          answered.length) *
          100,
      )
    : 0;
  const weakest = [...conceptMastery(fresh.events).values()]
    .filter((m) => m.struggling)
    .slice(0, 2)
    .map((m) => conceptName(m.conceptId));
  return (
    <section aria-labelledby="cierre-title" className="grid gap-5">
      <h1 id="cierre-title" className="text-3xl">
        {t('session.closeTitle')}
      </h1>
      {summary.dailyGoal.reached && (
        <p data-testid="goal-reached" className="text-bull text-xl">
          {t('session.goalReached')}
        </p>
      )}
      <p data-num data-testid="session-xp" className="text-2xl">
        {t('session.xp', { n: formatNumber(sessionXp) })}
      </p>
      <p className="text-text-2" data-num>
        {t(summary.streak.current === 1 ? 'session.streakOne' : 'session.streakMany', {
          n: formatNumber(summary.streak.current),
        })}
      </p>
      {weakest.length > 0 && (
        <p className="text-text-2 text-sm">{t('session.tomorrow', { list: weakest.join(', ') })}</p>
      )}
      <div className="grid justify-items-start gap-2">
        <TicketPrint
          rank={summary.rank.rank}
          streak={summary.streak.current}
          accuracy={accuracyPct}
        />
        <Button
          variant="secondary"
          onClick={() => {
            window.location.hash = '#/despacho/compartir';
          }}
        >
          {t('session.share')}
        </Button>
      </div>
      <ul aria-label={t('session.missions')} className="grid gap-2">
        {missions.map((m) => (
          <li
            key={m.id}
            className="bg-surface-1 border-line flex justify-between gap-3 rounded-[var(--radius-md)] border p-3 text-sm"
          >
            <span>{m.title}</span>
            <span data-num>{m.done ? '✓' : `${m.progress}/${m.target}`}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <Button onClick={onClose} data-block={index}>
          {t('session.closeAction')}
        </Button>
        <Button variant="ghost" onClick={onExit}>
          {t('session.later')}
        </Button>
      </div>
    </section>
  );
}
