import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-bg border-transparent',
  secondary: 'bg-surface-2 text-text border-line',
  ghost: 'bg-transparent text-text border-transparent',
  danger: 'bg-transparent text-bear border-bear',
};

/** 48 px mínimo; scale(0.97) en 100 ms al pulsar; hover solo con puntero que lo soporta. */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-5 font-medium transition-[transform,opacity] duration-100 ease-[var(--ease-out)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 [@media(hover:hover)]:hover:opacity-90 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
      {children}
    </button>
  );
}
