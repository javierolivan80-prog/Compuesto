import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../brand/Characters';
import { Bolsin } from '../../brand/Bolsin';
import { ReportErrorButton } from '../../components/ReportErrorButton';
import { GlossaryText } from '../glossary/GlossaryText';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import { TheoryCard } from '../../components/Micro';
import { ProgressBar } from '../../components/ProgressBar';
import type { Lesson } from '../../content/schemas';
import { useRepo } from '../../db/RepoProvider';
import {
  accuracy,
  answer,
  completionXp,
  currentId,
  isDone,
  startSession,
  xpForAnswer,
} from '../../engine/lesson-session';
import type { Summary } from '../../engine/projections';
import { formatNumber } from '../../lib/format';
import { ExerciseRunner, isSupported, type ExerciseOutcome } from '../exercises/ExerciseRunner';
import { levelName } from '../../content/library';
import { levelOfFloor } from '../../engine/floors';
import { Elevator } from '../sequences/Elevator';
import { RankUp } from '../sequences/RankUp';
import { ExplainerBlock } from './explainers';
import { BlockTradeGame } from '../games/BlockTradeGame';
import { FirstSharesGame } from '../games/FirstSharesGame';
import { AuctionGame } from '../games/AuctionGame';
import { IndexGame } from '../games/IndexGame';
import { DividendGame } from '../games/DividendGame';
import { IpoGame } from '../games/IpoGame';
import { TakeoverGame } from '../games/TakeoverGame';
import { BalanceGame } from '../games/BalanceGame';
import { CashGame } from '../games/CashGame';
import { RatioGame } from '../games/RatioGame';
import { CheapGame } from '../games/CheapGame';
import { WaccGame } from '../games/WaccGame';
import { DcfGame } from '../games/DcfGame';
import { BondGame } from '../games/BondGame';
import { CurveGame } from '../games/CurveGame';
import { FundGame } from '../games/FundGame';
import { LuckGame } from '../games/LuckGame';
import { FxGame } from '../games/FxGame';
import { RepoGame } from '../games/RepoGame';
import { DevDataToggle } from '../games/DevDataToggle';
import { WORST_SEEDS, worstCaseOn } from '../games/worst-seeds';
import { TapGuard } from '../games/kit/TapGuard';
import { LESSON_GAME_FORMATS } from '../../engine/games/lesson-games';
import { fillText } from '../../engine/params';

interface Closing {
  /** Celebraciones al cerrar: ascensor si sube de planta, subida de rango si cambia de rango. */
  celebrate: { rank: string | null; from: number; to: number; level: string } | null;
  xp: number;
  accuracy: number;
  summary: Summary;
}

interface Props {
  lesson: Lesson;
  onExit: () => void;
  /** Dentro de una sesión: el botón final sigue la sesión en vez de volver al inicio. */
  onFinished?: () => void;
  finishLabel?: string;
}

/** Lección completa: teoría (≤3 tarjetas) → ejercicios (fallos al final) → Cierre con XP y racha reales. */
export function LessonScreen({ lesson, onExit, onFinished, finishLabel }: Props) {
  const repo = useRepo();
  const afterGame = lesson.intro.length ? 'intro' : 'exercises';
  const [phase, setPhase] = useState<'game' | 'intro' | 'exercises' | 'closing'>(
    lesson.game ? 'game' : afterGame,
  );
  /** Cifras de tu partida (lección-juego): rellenan la explicación y los ejercicios. */
  const [gameValues, setGameValues] = useState<Record<string, number> | null>(null);
  const fill = (text: string) =>
    lesson.game && gameValues
      ? fillText(text, gameValues, LESSON_GAME_FORMATS[lesson.game.kind])
      : text;
  const [introIdx, setIntroIdx] = useState(0);
  const [session, setSession] = useState(() => startSession(lesson.exercises.map((e) => e.id)));
  const [closing, setClosing] = useState<Closing | null>(null);
  const [saveError, setSaveError] = useState(false);
  const started = useRef(false);
  const before = useRef<{ rankIndex: number; floor: number } | null>(null);
  const unitId = `n${lesson.level}-u${lesson.unit}`;

  /** Guardar nunca bloquea la lección: si falla se avisa y se sigue (el progreso de esta lección puede perderse). */
  const save = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      console.error('No se pudo guardar el progreso', e);
      setSaveError(true);
    }
  };

  useEffect(() => {
    if (started.current) return; // StrictMode monta dos veces en desarrollo
    started.current = true;
    // rango y planta de partida, para saber si esta lección los hace subir
    void repo
      .summary()
      .then((s) => (before.current = { rankIndex: s.rank.rankIndex, floor: s.rank.floor }))
      .catch(() => undefined);
    void save(() =>
      repo.record('lesson_started', { lessonId: lesson.id, unitId, level: lesson.level }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exercise = lesson.exercises.find((e) => e.id === currentId(session));

  const onComplete = async (outcome: ExerciseOutcome) => {
    if (!exercise) return;
    const { state, xp } = answer(session, outcome.correct, outcome.xpFactor);
    await save(() =>
      repo.record('exercise_answered', {
        exerciseId: exercise.id,
        lessonId: lesson.id,
        conceptIds: exercise.concepts,
        correct: outcome.correct,
        timeMs: Math.min(outcome.timeMs, 3_600_000),
        xp,
        ...(outcome.params ? { params: outcome.params } : {}),
      }),
    );
    setSession(state);
    if (isDone(state)) {
      const acc = accuracy(state);
      const bonus = completionXp(acc);
      await save(() =>
        repo.record('lesson_completed', {
          lessonId: lesson.id,
          unitId,
          level: lesson.level,
          xp: bonus,
          accuracy: acc,
        }),
      );
      let summary: Summary | null = null;
      await save(async () => {
        summary = await repo.summary();
      });
      const after = (summary as unknown as Summary | null)?.rank;
      const b = before.current;
      const celebrate =
        after && b && (after.rankIndex > b.rankIndex || after.floor > b.floor)
          ? {
              rank: after.rankIndex > b.rankIndex ? after.rank : null,
              from: b.floor,
              to: after.floor > b.floor ? after.floor : b.floor,
              level: levelName(levelOfFloor(after.floor) ?? 1),
            }
          : null;
      setClosing({
        celebrate,
        xp: state.xp + bonus,
        accuracy: acc,
        summary: summary as unknown as Summary,
      });
      setPhase('closing');
    }
  };

  const header = (
    <header className="flex items-center justify-between gap-3">
      <p className="text-text-2 min-w-0 text-sm [overflow-wrap:anywhere]">
        <span data-num>{unitId.toUpperCase()}</span> · {lesson.title}
      </p>
      <Button variant="ghost" className="shrink-0" onClick={onExit}>
        Salir
      </Button>
    </header>
  );

  const errorBanner = saveError && (
    <p role="alert" className="text-bear border-bear rounded-[var(--radius-sm)] border p-3 text-sm">
      Error: no se pudo guardar tu progreso en este dispositivo. Puedes seguir, pero esta lección
      podría no contar.
    </p>
  );

  if (phase === 'game' && lesson.game) {
    return (
      <section
        aria-label={`Lección: ${lesson.title}`}
        className="grid grid-cols-[minmax(0,1fr)] gap-5"
      >
        {header}
        {errorBanner}
        {(() => {
          const Game = {
            'block-trade': BlockTradeGame,
            'first-shares': FirstSharesGame,
            'opening-auction': AuctionGame,
            'index-mover': IndexGame,
            'dividend-day': DividendGame,
            'ipo-book': IpoGame,
            'takeover-rumor': TakeoverGame,
            'balance-builder': BalanceGame,
            'cash-cycle': CashGame,
            'ratio-detective': RatioGame,
            'cheap-or-dear': CheapGame,
            'wacc-mix': WaccGame,
            'dcf-express': DcfGame,
            'bond-issue': BondGame,
            'yield-curve': CurveGame,
            'fund-fees': FundGame,
            'luck-or-skill': LuckGame,
            'fx-trip': FxGame,
            'repo-night': RepoGame,
          }[lesson.game.kind];
          return (
            <TapGuard>
              <Game
                seed={worstCaseOn() ? WORST_SEEDS[lesson.game.kind] : lesson.game.seed}
                onDone={(v) => {
                  setGameValues(v);
                  setPhase(afterGame);
                }}
              />
            </TapGuard>
          );
        })()}
        <DevDataToggle />
      </section>
    );
  }

  if (phase === 'intro') {
    const block = lesson.intro[introIdx]!;
    const last = introIdx === lesson.intro.length - 1;
    return (
      <section
        aria-label={`Lección: ${lesson.title}`}
        className="grid grid-cols-[minmax(0,1fr)] gap-5"
      >
        {header}
        {errorBanner}
        <ProgressBar value={introIdx} max={lesson.intro.length + 1} label="Progreso de la teoría" />
        <h2 className="text-3xl">{lesson.title}</h2>
        <div key={introIdx} className="grid gap-4">
          {block.type === 'card' && (
            <TheoryCard term={block.term ?? 'Idea clave'}>
              <GlossaryText text={fill(block.text)} />
            </TheoryCard>
          )}
          {block.type === 'example' && (
            <aside className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
              <p className="text-text-2 mb-1 text-sm">Ejemplo</p>
              <p>{fill(block.text)}</p>
            </aside>
          )}
          {block.type === 'visual' && (
            <ExplainerBlock
              component={block.component}
              props={block.props}
              onInteract={(explainerId) =>
                void save(() =>
                  repo.record('explainer_interacted', { explainerId, lessonId: lesson.id }),
                )
              }
            />
          )}
        </div>
        <div className="bg-bg sticky bottom-0 py-3">
          <Button
            className="w-full"
            onClick={() => (last ? setPhase('exercises') : setIntroIdx(introIdx + 1))}
          >
            {last ? 'Empezar los ejercicios' : 'Siguiente'}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === 'closing' && closing) {
    const streak = closing.summary?.streak.current;
    return (
      <section
        aria-label="Cierre de la lección"
        className="grid justify-items-center gap-5 text-center"
      >
        <Bolsin state="celebrando" size={120} />
        <h2 className="text-4xl">Lección completada</h2>
        <p className="text-text-2">{lesson.title}</p>
        {closing.celebrate && closing.celebrate.to > closing.celebrate.from && (
          <div className="w-full max-w-sm">
            <Elevator
              from={closing.celebrate.from}
              to={closing.celebrate.to}
              name={closing.celebrate.level}
            />
          </div>
        )}
        {closing.celebrate?.rank && (
          <div className="w-full max-w-sm">
            <RankUp rank={closing.celebrate.rank} hideContinue />
          </div>
        )}
        <dl className="grid w-full max-w-sm grid-cols-2 gap-3 text-left">
          <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
            <dt className="text-text-2 text-sm">XP ganado</dt>
            <dd className="text-3xl">
              +<AnimatedNumber value={closing.xp} initial={0} />
            </dd>
          </div>
          <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
            <dt className="text-text-2 text-sm">Precisión</dt>
            <dd className="text-3xl" data-num>
              {formatNumber(Math.round(closing.accuracy * 100))} %
            </dd>
          </div>
          <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
            <dt className="text-text-2 text-sm">Racha</dt>
            <dd className="text-3xl" data-num>
              {streak === undefined
                ? '—'
                : `${formatNumber(streak)} ${streak === 1 ? 'día' : 'días'}`}
            </dd>
          </div>
          <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
            <dt className="text-text-2 text-sm">Rango</dt>
            <dd className="text-xl">{closing.summary?.rank.rank ?? '—'}</dd>
          </div>
        </dl>
        {errorBanner}
        <Button className="w-full max-w-sm" onClick={onFinished ?? onExit}>
          {finishLabel ?? 'Continuar'}
        </Button>
      </section>
    );
  }

  return (
    <section aria-label={`Ejercicios: ${lesson.title}`} className="grid gap-4">
      {header}
      {errorBanner}
      <ProgressBar
        value={session.done.length}
        max={session.total}
        label="Progreso de la lección"
        asCurve={session.done.length === session.total - 1 && session.queue.length === 1}
      />
      {exercise ? (
        <>
          {exercise.character && (
            <div className="flex items-center gap-3">
              <Avatar character={exercise.character} size={48} />
            </div>
          )}
          {isSupported(exercise) ? (
            <ExerciseRunner
              key={`${exercise.id}#${session.failedOnce.includes(exercise.id) ? 2 : 1}`}
              exercise={exercise}
              values={gameValues ?? undefined}
              xp={xpForAnswer(true, session.failedOnce.includes(exercise.id))}
              onComplete={(o) => void onComplete(o)}
            />
          ) : (
            <p role="alert">Este tipo de ejercicio aún no está disponible ({exercise.type}).</p>
          )}
          <ReportErrorButton exerciseId={exercise.id} />
        </>
      ) : null}
    </section>
  );
}
