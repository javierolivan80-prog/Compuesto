import { Button } from '../components/Button';
import { t } from '../i18n';

/** Aviso de nueva versión: solo se muestra fuera de las lecciones y solo actualiza al pulsar (salvo versión mínima forzada). */
export function UpdateBanner({
  forced,
  onApply,
  onDismiss,
}: {
  forced: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-labelledby="upd-title"
      className="bg-surface-2 border-brand grid gap-3 rounded-[var(--radius-md)] border p-4"
    >
      <h2 id="upd-title" className="text-xl">
        {t('pwa.update.title')}
      </h2>
      <p className="text-text-2 text-sm">{t('pwa.update.body')}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onApply}>{t('pwa.update.action')}</Button>
        {!forced && (
          <Button variant="ghost" onClick={onDismiss}>
            {t('pwa.update.later')}
          </Button>
        )}
      </div>
    </section>
  );
}

/** Recordatorio semanal de exportar copia (CLAUDE.md §3b): sin sincronización, la copia es la red de seguridad. */
export function BackupReminderBanner({
  days,
  onExport,
  onDismiss,
}: {
  days: number | null;
  onExport: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-labelledby="bk-title"
      className="bg-surface-1 border-line grid gap-3 rounded-[var(--radius-md)] border p-4"
    >
      <h2 id="bk-title" className="text-xl">
        {t('pwa.backup.reminderTitle')}
      </h2>
      <p className="text-text-2 text-sm">
        {days === null ? t('pwa.backup.reminderNever') : t('pwa.backup.reminderOld', { days })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onExport}>
          {t('pwa.backup.action')}
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          {t('pwa.backup.dismiss')}
        </Button>
      </div>
    </section>
  );
}
