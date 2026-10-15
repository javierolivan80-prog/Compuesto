import { useId } from 'react';

/** Curva del interés compuesto: trazo fino dorado que despega. Hereda el color del tema. */
export const CURVE_PATH = 'M6 54 C 26 53, 40 46, 58 8';

interface LogoProps {
  /** `symbol`: solo la curva. `full`: curva + wordmark en Instrument Serif. */
  variant?: 'symbol' | 'full';
  size?: number;
  title?: string;
}

export function Logo({ variant = 'full', size = 40, title = 'Compuesto' }: LogoProps) {
  const id = useId();
  const symbol = (
    <g fill="none" stroke="var(--brand)" strokeLinecap="round">
      <path d="M6 58 H58" stroke="var(--line)" strokeWidth="1" />
      <path d={CURVE_PATH} strokeWidth="2" />
      <circle cx="58" cy="8" r="3" fill="var(--brand)" stroke="none" />
    </g>
  );

  if (variant === 'symbol') {
    return (
      <svg role="img" aria-labelledby={id} width={size} height={size} viewBox="0 0 64 64">
        <title id={id}>{title}</title>
        {symbol}
      </svg>
    );
  }

  return (
    <svg role="img" aria-labelledby={id} height={size} width={size * 4.4} viewBox="0 0 282 64">
      <title id={id}>{title}</title>
      {symbol}
      <text
        x="76"
        y="46"
        fill="var(--text)"
        style={{ fontFamily: 'var(--font-display)', fontSize: 44 }}
      >
        Compuesto
      </text>
    </svg>
  );
}
