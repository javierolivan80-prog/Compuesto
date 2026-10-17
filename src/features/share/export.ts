import { toBlob } from 'html-to-image';
import { CARD_SIZE, type CardFormat } from './card';

/** Renderiza la tarjeta a PNG exacto (sin escalado del dispositivo). Todo en local: las fuentes se incrustan desde la propia app. */
export async function cardToPng(node: HTMLElement, format: CardFormat): Promise<Blob> {
  const { width, height } = CARD_SIZE[format];
  // las fuentes deben estar listas antes de dibujar; si no, saldría la tipografía de reserva
  await document.fonts?.ready;
  const blob = await toBlob(node, {
    width,
    height,
    canvasWidth: width,
    canvasHeight: height,
    pixelRatio: 1,
    cacheBust: false,
    style: { transform: 'none', margin: '0' },
  });
  if (!blob) throw new Error('No se pudo generar la imagen');
  return blob;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/** Web Share API con archivo en móvil; si no existe (escritorio), descarga. */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string,
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return 'cancelled';
    // cualquier otro fallo del panel de compartir: se cae a la descarga
  }
  return download(blob, filename) ? 'downloaded' : 'failed';
}

export function download(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
