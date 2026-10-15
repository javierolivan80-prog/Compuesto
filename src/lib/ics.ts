/**
 * Recordatorio diario en el calendario (.ics generado en local, CLAUDE.md §12): evento recurrente cada día
 * a la hora elegida, con hora "flotante" (la del dispositivo, sin zona), de la duración de la sesión.
 */
export interface IcsOptions {
  /** "19:30" */
  time: string;
  minutes: number;
  /** Primer día, yyyy-mm-dd */
  startDay: string;
  uid?: string;
  now?: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function buildIcs({
  time,
  minutes,
  startDay,
  uid = crypto.randomUUID(),
  now = new Date(),
}: IcsOptions): string {
  if (!isValidTime(time)) throw new RangeError('Hora no válida (HH:MM)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay)) throw new RangeError('Día no válido (yyyy-mm-dd)');
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)
    throw new RangeError('Duración no válida');
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const start = `${startDay.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Compuesto//Recordatorio diario//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}@compuesto.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DURATION:PT${minutes}M`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText('Abrir mercado · Compuesto')}`,
    `DESCRIPTION:${escapeText('Tu sesión diaria. Poco cada día se capitaliza.')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText('Bolsín te guarda la racha')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
