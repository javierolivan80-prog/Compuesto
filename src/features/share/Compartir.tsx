import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { ErrorState, Loading } from '../../components/States';
import { personalStats, todayKey } from '../../engine/stats';
import { stockFromEvents } from '../../engine/stock';
import { t } from '../../i18n';
import { toast } from '../../lib/toast';
import {
  CARD_FORMATS,
  CARD_SIZE,
  CARD_STYLES,
  buildCardData,
  cardFilename,
  type CardFormat,
  type CardStyle,
} from './card';
import { cardToPng, download, shareOrDownload } from './export';
import { ShareCard } from './ShareCard';

/** Compartir mi progreso: elige formato y estilo, vista previa y genera la imagen en local (sin red). */
export function Compartir({ data }: { data: AppData }) {
  const [format, setFormat] = useState<CardFormat>('story');
  const [style, setStyle] = useState<CardStyle>('terminal');
  const [busy, setBusy] = useState(false);
  const full = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(320);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth || 320));
    ro.observe(el);
    setBoxW(el.clientWidth || 320);
    return () => ro.disconnect();
  }, [data.loading]);

  const today = todayKey(new Date());
  const card = useMemo(() => {
    if (!data.summary) return null;
    const initials = data.summary.settings['tickerInitials'];
    const stock = stockFromEvents(
      data.events,
      today,
      typeof initials === 'string' ? initials : 'YO',
    );
    const stats = personalStats(data.events, data.summary, today);
    return buildCardData(data.summary, stock, stats.accuracy, today);
  }, [data.events, data.summary, today]);

  if (data.loading) return <Loading />;
  if (data.error || !card)
    return <ErrorState message={t('share.errorLoad')} onRetry={data.reload} />;

  const { width, height } = CARD_SIZE[format];
  const scale = Math.min(1, boxW / width);
  const canShare =
    typeof navigator.canShare === 'function' && typeof navigator.share === 'function';

  const make = async (mode: 'share' | 'download') => {
    if (!full.current) return;
    setBusy(true);
    try {
      const blob = await cardToPng(full.current, format);
      const name = cardFilename(format, style, today);
      if (mode === 'share') {
        const r = await shareOrDownload(blob, name, t('share.title'));
        if (r === 'downloaded') toast(t('share.downloaded'));
        else if (r === 'failed') toast(t('share.failed'));
      } else toast(download(blob, name) ? t('share.downloaded') : t('share.failed'));
    } catch (e) {
      console.error('No se pudo generar la tarjeta', e);
      toast(t('share.failed'));
    } finally {
      setBusy(false);
    }
  };

  const summary = t('share.preview', {
    rank: card.rank,
    streak: card.streak,
    xp: card.xp,
    accuracy: card.accuracyPct === null ? '—' : card.accuracyPct,
  });

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">{t('share.title')}</h1>
      <p className="text-text-2 text-sm">{t('share.intro')}</p>

      <fieldset className="grid min-w-0 gap-2">
        <legend className="mb-1 text-lg">{t('share.format')}</legend>
        <div role="radiogroup" aria-label={t('share.format')} className="flex flex-wrap gap-2">
          {CARD_FORMATS.map((f) => (
            <Button
              key={f}
              role="radio"
              aria-checked={format === f}
              variant={format === f ? 'primary' : 'secondary'}
              onClick={() => setFormat(f)}
            >
              {t(`share.formats.${f}`)}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid min-w-0 gap-2">
        <legend className="mb-1 text-lg">{t('share.style')}</legend>
        <div role="radiogroup" aria-label={t('share.style')} className="flex flex-wrap gap-2">
          {CARD_STYLES.map((s) => (
            <Button
              key={s}
              role="radio"
              aria-checked={style === s}
              variant={style === s ? 'primary' : 'secondary'}
              onClick={() => setStyle(s)}
            >
              {t(`share.styles.${s}`)}
            </Button>
          ))}
        </div>
      </fieldset>

      <div ref={box} className="w-full max-w-sm min-w-0 justify-self-center">
        <div
          role="img"
          aria-label={summary}
          className="border-line overflow-hidden rounded-[var(--radius-md)] border"
          style={{ width: width * scale, height: height * scale }}
          data-testid="share-preview"
        >
          <div
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            aria-hidden="true"
          >
            <ShareCard data={card} format={format} cardStyle={style} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {canShare && (
          <Button onClick={() => void make('share')} loading={busy}>
            {t('share.share')}
          </Button>
        )}
        <Button
          variant={canShare ? 'secondary' : 'primary'}
          onClick={() => void make('download')}
          loading={busy}
        >
          {t('share.download')}
        </Button>
      </div>
      <p className="text-text-2 text-sm">{t('share.offline')}</p>

      {/* copia a tamaño real fuera de pantalla: de aquí sale la imagen exacta */}
      <div
        aria-hidden="true"
        inert
        style={{ position: 'fixed', left: -100000, top: 0, width, height, pointerEvents: 'none' }}
      >
        <ShareCard ref={full} data={card} format={format} cardStyle={style} />
      </div>
    </div>
  );
}
