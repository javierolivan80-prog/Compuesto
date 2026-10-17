import { StockPanel } from '../../components/StockPanel';
import { stockFromEvents } from '../../engine/stock';
import { CompoundRing } from '../../components/CompoundRing';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { allLessonMeta } from '../../content/meta';
import { useUniverse } from '../../content/useUniverse';
import { dailyMissions } from '../../engine/missions';
import { activeSession } from '../../engine/session';
import { todayKey } from '../../engine/stats';
import { universeTicker } from '../../engine/ticker';
import { formatDelta, formatNumber } from '../../lib/format';
import type { AppData } from '../../app/hooks';

/** Inicio: ticker del universo ficticio, objetivo del día, racha y la siguiente lección (hasta que exista la sesión, 2.2). */
export function Home({ data, onStart }: { data: AppData; onStart: (id: string) => void }) {
  const universe = useUniverse();
  if (data.loading) return <Loading />;
  if (data.error || !data.summary)
    return (
      <ErrorState
        message="no se pudo leer tu progreso en este dispositivo."
        onRetry={data.reload}
      />
    );
  const { summary } = data;
  const lessons = allLessonMeta();
  const completed = (id: string) => summary.progress.lessons[id]?.status === 'completed';
  const next = lessons.find((l) => !completed(l.id));
  const started = next ? !!summary.progress.lessons[next.id] : false;
  const goal = summary.dailyGoal;
  const today = todayKey(new Date());
  const resumable = activeSession(data.events, today);
  const missions = dailyMissions(data.events, today, goal.goal);
  const initials = String(summary.settings['tickerInitials'] ?? 'YO');
  const stock = stockFromEvents(data.events, today, initials);
  const ticker = universe ? universeTicker(universe, todayKey(new Date())) : [];

  return (
    <div className="grid gap-6">
      <section
        aria-label="Cinta del universo Compuesto"
        className="grid min-h-12 content-start gap-1"
      >
        <ul
          className="text-text-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {ticker.map((t) => (
            <li key={t.symbol} data-num>
              {t.symbol} {formatNumber(t.price, 2)}{' '}
              <span className={t.changePct >= 0 ? 'text-bull' : 'text-bear'}>
                {formatDelta(t.changePct)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-text-2 text-xs">Cifras ficticias del universo Compuesto.</p>
      </section>

      <section
        aria-labelledby="goal-title"
        className="bg-surface-1 border-line flex items-center gap-4 rounded-[var(--radius-md)] border p-4"
      >
        <CompoundRing
          progress={goal.goal ? goal.xp / goal.goal : 0}
          label="Objetivo de hoy"
          size={96}
        />
        <div className="grid gap-1">
          <h2 id="goal-title" className="text-xl">
            Objetivo de hoy
          </h2>
          <p data-num data-testid="goal-xp">
            {formatNumber(goal.xp)} / {formatNumber(goal.goal)} XP
          </p>
          {goal.reached && <p className="text-bull text-sm">✓ Objetivo cumplido</p>}
          <p className="text-text-2 text-sm" data-num>
            Racha: <span data-testid="streak">{formatNumber(summary.streak.current)} d</span>
            {summary.streak.atRisk && ' · juega hoy para mantenerla'}
          </p>
        </div>
      </section>

      <StockPanel stock={stock} days={30} height={140} />

      <dl className="grid grid-cols-2 gap-3 text-center" aria-label="Tu progreso">
        <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
          <dt className="text-text-2 text-sm">XP total</dt>
          <dd className="text-2xl" data-num data-testid="xp-total">
            {formatNumber(summary.xp.total)}
          </dd>
        </div>
        <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
          <dt className="text-text-2 text-sm">Rango</dt>
          <dd>
            <span className="text-lg">{summary.rank.rank}</span>
            {summary.rank.nextRank && (
              <span className="text-text-2 block text-xs" data-num>
                {formatNumber(summary.rank.xpToNext ?? 0)} XP para {summary.rank.nextRank}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="ses-title" className="grid gap-3">
        <h2 id="ses-title" className="text-2xl">
          Sesión de hoy
        </h2>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            window.location.hash = '#/sesion';
          }}
        >
          {resumable ? 'Reanudar sesión' : 'Sesión de 20 min'}
        </Button>
        <ul aria-label="Misiones de hoy" className="grid gap-2">
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
      </section>

      {next ? (
        <section aria-labelledby="next-title" className="grid gap-3">
          <h2 id="next-title" className="text-2xl">
            Siguiente
          </h2>
          <p>
            {next.title}
            <span className="text-text-2 block text-sm">
              {started ? 'Empezada' : `Unidad ${next.unit} del Nivel ${next.level}`}
            </span>
          </p>
          <Button onClick={() => onStart(next.id)} className="w-full">
            {started ? 'Continuar' : 'Abrir mercado'}
          </Button>
        </section>
      ) : (
        <EmptyState title="Has completado todo lo disponible">
          Pronto habrá más contenido. Mientras tanto, repite lecciones desde Practicar.
        </EmptyState>
      )}

      <p className="text-text-2 text-sm">Contenido educativo, no asesoramiento financiero.</p>
    </div>
  );
}
