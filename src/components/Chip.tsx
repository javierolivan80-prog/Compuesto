import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  selected?: boolean;
  children: ReactNode;
}

/** Chip conmutable: aria-pressed, no solo color. */
export function Chip({ selected = false, children, className = '', ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-[transform,background-color] duration-100 active:scale-[0.97] ${selected ? 'border-brand bg-surface-2 text-text' : 'border-line bg-transparent text-text-2'} ${className}`}
      {...rest}
    >
      {selected && <span aria-hidden="true">✓</span>}
      {children}
    </button>
  );
}
