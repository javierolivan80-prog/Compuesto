import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Loading } from '../../components/States';
import { conceptName } from '../../content/library';
import { useRepo } from '../../db/RepoProvider';
import type { AppEvent } from '../../engine/events';
import { gameXp, type Rating } from '../../engine/game-kit';
import { bellSequence, playBell, type BellAnswer } from '../../engine/games/bell';
import { BUDGET_ROUNDS, playBudget, type BudgetCategory } from '../../engine/games/budget';
import {
  dailyBest,
  gamesPlayedOn,
  gameInfo,
  isNewRecord,
  gameRecords,
} from '../../engine/games/catalog';
import { dailySeed, type GameId, type GameResult } from '../../engine/games/common';
import { playCompound, type CompoundChoice } from '../../engine/games/compound';
import { playImpulsive } from '../../engine/games/impulsive';
import { playNews, type NewsAnswer } from '../../engine/games/news';
import { playOrders, type OrderChoice } from '../../engine/games/orders';
import { todayKey } from '../../engine/stats';
import { universeTicker } from '../../engine/ticker';
import { t } from '../../i18n';
import { useUniverse } from '../../content/useUniverse';
import { BellGame } from './BellGame';
import { BudgetGame } from './BudgetGame';
import { CompoundGame } from './CompoundGame';
import { ImpulsiveGame } from './ImpulsiveGame';
import { gameData, type GameData } from './data';
import { GameShell, ResultScreen } from './kit';
import { NewsGame } from './NewsGame';
import { OrdersGame } from './OrdersGame';

interface Props {
  gameId: GameId;
  /** Partida del día: semilla diaria para comparar récords. */
  daily: boolean;
  onExit: () => void;
  /** Dentro de una sesión: el botón final sigue la sesión. */
  onFinished?: () => void;
  finishLabel?: string;
}

interface Done {
  result: GameResult;
  isNew: boolean;
  best: Rating;
  xp: number;
  dailyBest: { rating: Rating } | null;
}

const randomSeed = () => Math.floor(Math.random() * 2_147_483_647);

/** Marco de una partida: carga el progreso, elige semilla, muestra tutorial la primera vez, guarda la partida y su resultado. */
export function GameHost({ gameId, daily, onExit, onFinished, finishLabel }: Props) {
  const repo = useRepo();
  const [ctx, setCtx] = useState<{ events: AppEvent[]; untimed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [asDaily, setAsDaily] = useState(daily);
  const [untimed, setUntimed] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState(false);
  const today = todayKey(new Date());
  const seed = useMemo(
    () => (asDaily ? dailySeed(gameId, today) : randomSeed()),
    // una semilla nueva por intento
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameId, asDaily, attempt, today],
  );
  const universe = useUniverse();
  const ticker = useMemo(
    () => (universe ? universeTicker(universe, today) : []),
    [universe, today],
  );
  const events = useRef<AppEvent[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all([repo.allEvents(), repo.summary()])
      .then(([evs, summary]) => {
        if (!alive) return;
        events.current = evs;
        const u = summary.settings['gamesUntimed'] === true;
        setUntimed(u);
        setCtx({ events: evs, untimed: u });
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [repo]);

  const data: GameData | null = useMemo(() => (ctx ? gameData(ctx.events) : null), [ctx]);
  const tutorial = ctx ? !gameRecords(ctx.events).has(gameId) : false;

  if (error)
    return (
      <section className="grid gap-4">
        <p role="alert">{t('games.error')}</p>
        <Button onClick={onExit}>{t('games.exit')}</Button>
      </section>
    );
  if (!ctx || !data) return <Loading />;

  const finish = async (result: GameResult) => {
    const evs = events.current;
    const isNew = isNewRecord(evs, gameId, result.score);
    const xp = gameXp(result.rating, gamesPlayedOn(evs, today));
    try {
      await repo.record('game_played', {
        gameId,
        seed,
        daily: asDaily,
        score: Math.round(result.score * 1000) / 1000,
        rating: result.rating,
        missedConcepts: result.missedConcepts,
        xp,
      });
      events.current = await repo.allEvents();
    } catch (e) {
      console.error('No se pudo guardar la partida', e);
    }
    const rec = gameRecords(events.current).get(gameId);
    setDone({
      result,
      isNew,
      best: rec?.bestRating ?? result.rating,
      xp,
      dailyBest: asDaily ? dailyBest(events.current, gameId, today) : null,
    });
  };

  const info = gameInfo(gameId);
  const play = () => {
    switch (gameId) {
      case 'campana':
        return (
          <BellGameRun
            seed={seed}
            deck={data.deck}
            untimed={untimed}
            tutorial={tutorial}
            ticker={ticker}
            onResult={finish}
          />
        );
      case 'presupuesto':
        return (
          <BudgetGame
            seed={seed}
            untimed={untimed}
            tutorial={tutorial}
            onFinish={(r: (BudgetCategory | null)[][]) =>
              void finish(playBudget(seed, r.slice(0, BUDGET_ROUNDS)))
            }
          />
        );
      case 'mesa-ordenes':
        return (
          <OrdersGame
            seed={seed}
            withAuction={data.withAuction}
            untimed={untimed}
            tutorial={tutorial}
            onFinish={(c: (OrderChoice | null)[]) =>
              void finish(playOrders(seed, data.withAuction, c))
            }
          />
        );
      case 'sube-o-baja':
        return (
          <NewsGame
            seed={seed}
            pool={data.headlines}
            untimed={untimed}
            tutorial={tutorial}
            onFinish={(a: NewsAnswer[]) => void finish(playNews(seed, data.headlines, a))}
          />
        );
      case 'impulsivo':
        return (
          <ImpulsiveGame
            seed={seed}
            untimed={untimed}
            tutorial={tutorial}
            onFinish={(d: boolean[]) => void finish(playImpulsive(seed, d))}
          />
        );
      case 'magia-compuesto':
        return (
          <CompoundGame
            seed={seed}
            tutorial={tutorial}
            onFinish={(c: CompoundChoice[]) => void finish(playCompound(seed, c))}
          />
        );
    }
  };

  return (
    <GameShell
      title={info.title}
      untimed={untimed}
      onUntimedChange={(v) => {
        setUntimed(v);
        void repo
          .record('settings_changed', { key: 'gamesUntimed', value: v })
          .catch(() => undefined);
      }}
      onExit={onExit}
    >
      {done ? (
        <div className="grid gap-4">
          <ResultScreen
            rating={done.result.rating}
            learned={done.result.learned}
            fact={done.result.fact}
            record={{ best: done.best, isNew: done.isNew }}
            onAgain={() => {
              setDone(null);
              setAsDaily(false);
              setAttempt((n) => n + 1);
            }}
            onExit={onFinished ? undefined : onExit}
          />
          <p data-num className="text-text-2 text-center text-sm" data-testid="game-xp">
            {done.xp > 0 ? t('games.xp', { n: done.xp }) : t('games.noXp')}
          </p>
          {done.dailyBest && (
            <p className="text-text-2 text-center text-sm" data-num>
              {t('games.dailyBest', { rating: done.dailyBest.rating })}
            </p>
          )}
          {done.result.missedConcepts.length > 0 && (
            <section aria-labelledby="missed-title" className="grid gap-2">
              <h2 id="missed-title" className="text-xl">
                {t('games.missedTitle')}
              </h2>
              <ul className="grid gap-2">
                {done.result.missedConcepts.slice(0, 4).map((c) => (
                  <li key={c} className="flex items-center justify-between gap-3">
                    <span>{conceptName(c)}</span>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        window.location.hash = `#/repaso/tema/${c}`;
                      }}
                    >
                      {t('games.practice')}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {onFinished && <Button onClick={onFinished}>{finishLabel ?? t('games.continue')}</Button>}
        </div>
      ) : (
        <div key={`${seed}:${attempt}`}>{play()}</div>
      )}
    </GameShell>
  );
}

/** La Campana necesita la secuencia calculada una vez por partida. */
function BellGameRun({
  seed,
  deck,
  untimed,
  tutorial,
  ticker,
  onResult,
}: {
  seed: number;
  deck: GameData['deck'];
  untimed: boolean;
  tutorial: boolean;
  ticker: { symbol: string; price: number; changePct: number }[];
  onResult: (r: GameResult) => Promise<void>;
}) {
  const cards = useMemo(() => bellSequence(deck, seed), [deck, seed]);
  return (
    <BellGame
      cards={cards}
      untimed={untimed}
      tutorial={tutorial}
      ticker={ticker}
      onFinish={(answers: BellAnswer[]) => void onResult(playBell(seed, cards, answers))}
    />
  );
}
