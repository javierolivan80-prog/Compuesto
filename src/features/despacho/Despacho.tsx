import { BookOpen, Bug, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { findExerciseText } from '../../content/library';
import { personalStats, statsToCsv, todayKey } from '../../engine/stats';
import { downloadText } from '../../lib/download';
import { formatNumber } from '../../lib/format';

const LINKS = [
  { href: '#/despacho/glosario', label: 'Glosario', Icon: BookOpen },
  { href: '#/despacho/ajustes', label: 'Ajustes', Icon: Settings },
  { href: '#/despacho/reportes', label: 'Reportes de errores', Icon: Bug },
];

/** Despacho (perfil): rango, estadísticas personales locales (CLAUDE.md §11), glosario y ajustes. */
export function Despacho({ data }: { data: AppData }) {
  if (data.loading) return <Loading />;
  if (data.error || !data.summary)
    return (
      <ErrorState
        message="no se pudo leer tu progreso en este dispositivo."
        onRetry={data.reload}
      />
    );
  const { summary } = data;
  const stats = personalStats(data.events, summary, todayKey(new Date()));
  const initials = summary.settings['tickerInitials'];

  const exportCsv = () => {
    const ok = downloadText(
      'compuesto-estadisticas.csv',
      statsToCsv(stats, summary.xp.byDay),
      'text/csv',
    );
    toast(ok ? 'Estadísticas exportadas (CSV).' : 'No se pudo exportar en este navegador.');
  };

  const cells: [string, string][] = [
    ['XP total', formatNumber(stats.totalXp)],
    ['Racha actual', `${formatNumber(stats.streak)} d`],
    ['Racha máxima', `${formatNumber(stats.longestStreak)} d`],
    ['Días activos', formatNumber(stats.activeDays)],
    ['Activos (7 días)', `${formatNumber(stats.activeDaysLast7)} / 7`],
    ['Lecciones completadas', formatNumber(stats.lessonsCompleted)],
    ['Ejercicios respondidos', formatNumber(stats.exercisesAnswered)],
    [
      'Precisión',
      stats.accuracy === null ? '—' : `${formatNumber(Math.round(stats.accuracy * 100))} %`,
    ],
  ];

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-3xl">Despacho</h1>
        <p className="text-text-2" data-num>
          {typeof initials === 'string' && (
            <span style={{ fontFamily: 'var(--font-mono)' }}>${initials} · </span>
          )}
          {summary.rank.rank}
        </p>
      </header>

      <section aria-labelledby="stats-title" className="grid gap-3">
        <h2 id="stats-title" className="text-2xl">
          Tu cartera de conocimiento
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          {cells.map(([k, v]) => (
            <div key={k} className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
              <dt className="text-text-2 text-sm">{k}</dt>
              <dd className="text-xl" data-num>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <Button variant="secondary" onClick={exportCsv} className="justify-self-start">
          Exportar estadísticas (CSV)
        </Button>
      </section>

      <section aria-labelledby="failed-title" className="grid gap-2">
        <h2 id="failed-title" className="text-2xl">
          Ejercicios más fallados
        </h2>
        {stats.mostFailed.length === 0 ? (
          <EmptyState title="Sin fallos registrados">
            Cuando falles un ejercicio, aparecerá aquí para que lo revises.
          </EmptyState>
        ) : (
          <ol className="grid gap-2">
            {stats.mostFailed.map((f) => {
              const info = findExerciseText(f.exerciseId);
              return (
                <li
                  key={f.exerciseId}
                  className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3 text-sm"
                >
                  <p>{info?.prompt ?? f.exerciseId}</p>
                  <p className="text-text-2" data-num>
                    {info?.where ? `${info.where} · ` : ''}
                    {f.fails} fallo(s) en {f.attempts} intento(s)
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <nav aria-label="Más opciones del despacho">
        <ul className="grid gap-2">
          {LINKS.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                className="bg-surface-1 border-line flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border px-4"
              >
                <Icon aria-hidden size={20} />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-text-2 text-sm">
        Contenido educativo, no asesoramiento financiero. No es un título oficial.
      </p>
    </div>
  );
}
