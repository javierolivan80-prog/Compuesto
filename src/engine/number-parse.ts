export type NumberLocale = 'es' | 'en';

/**
 * Interpreta lo que escribe una persona: "1.234,56", "1,234.56", "1234,5", "1 234,5", "12,5 %", "1.001 €".
 * Con dos separadores distintos, el último es el decimal. Con uno solo:
 *  - repetido → es de miles ("1.234.567");
 *  - único y seguido de exactamente 3 dígitos → miles en el idioma que lo usa como miles ("1.234" en es = 1234);
 *  - en cualquier otro caso → decimal ("12,5", "3.14", "0,001" no: 3 dígitos tras el separador se leen como miles salvo que
 *    la parte entera sea 0 → "0,001" = 0.001).
 * Devuelve null si no es un número.
 */
export function parseNumber(input: string, locale: NumberLocale = 'es'): number | null {
  let s = input
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/[€$£%]|eur(os)?|usd/gi, '')
    .replace(/−/g, '-');
  if (!s || !/^[-+]?[\d.,]+$/.test(s)) return null;
  let sign = 1;
  if (s[0] === '-' || s[0] === '+') {
    sign = s[0] === '-' ? -1 : 1;
    s = s.slice(1);
  }
  if (!/\d/.test(s) || /^[.,]|[.,]$/.test(s)) return null;

  const thousands = locale === 'es' ? '.' : ',';
  const decimal = locale === 'es' ? ',' : '.';
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  let dec: '.' | ',' | null = null;
  if (lastDot >= 0 && lastComma >= 0) {
    dec = lastDot > lastComma ? '.' : ',';
    const other = dec === '.' ? ',' : '.';
    // el separador de miles debe aparecer en grupos de 3 y antes del decimal
    const intPart = s.slice(0, s.lastIndexOf(dec));
    if (!new RegExp(`^\\d{1,3}(\\${other}\\d{3})*$`).test(intPart)) return null;
    if (s.indexOf(dec) !== s.lastIndexOf(dec)) return null;
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const count = s.split(sep).length - 1;
    const after = s.length - s.lastIndexOf(sep) - 1;
    const before = s.slice(0, s.indexOf(sep));
    if (count > 1) {
      if (!new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(s)) return null; // miles repetidos
    } else if (after === 3 && before !== '0' && before !== '') {
      dec = sep === decimal ? decimal : null; // 1.234 (es) = miles; 1,234 (es) = 1,234 decimal
      if (sep === thousands) dec = null;
    } else {
      dec = sep;
    }
  }

  const clean = dec
    ? s.replace(new RegExp(`\\${dec === '.' ? ',' : '.'}`, 'g'), '').replace(dec, '.')
    : s.replace(/[.,]/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? sign * n : null;
}
