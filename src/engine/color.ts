export interface Oklch {
  l: number;
  c: number;
  h: number;
}

// El minificador de CSS reescribe `oklch(0.16 0.02 255)` como `oklch(16% .02 255)`:
// se aceptan luminosidad en %, números sin cero inicial y alfa opcional.
const NUM = '(\\d*\\.?\\d+)';
const OKLCH_RE = new RegExp(
  `oklch\\(\\s*${NUM}(%?)\\s+${NUM}(%?)\\s+${NUM}(?:deg)?(?:\\s*/\\s*[\\d.]+%?)?\\s*\\)`,
  'i',
);

export function parseOklch(value: string): Oklch {
  const m = OKLCH_RE.exec(value);
  if (!m) throw new Error(`Color OKLCH no válido: "${value}"`);
  const l = m[2] ? Number(m[1]) / 100 : Number(m[1]);
  const c = m[4] ? (Number(m[3]) / 100) * 0.4 : Number(m[3]);
  return { l, c, h: Number(m[5]) };
}

/** OKLCH → sRGB lineal (0–1, recortado al gamut). */
export function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    clamp(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    clamp(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  ];
}

/** Luminancia relativa WCAG a partir de un color OKLCH. */
export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG 2.x entre dos colores OKLCH. */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB (0–255, con gamma) de un color OKLCH, para `theme-color`. */
export function oklchToHex(color: Oklch): string {
  const enc = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return (
    '#' +
    oklchToLinearRgb(color)
      .map((v) =>
        Math.round(enc(v) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
