import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Texto ≥16 px (evita el zoom de iOS); error con texto además de color. */
export function Input({ label, error, hint, className = '', ...rest }: InputProps) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-text-2 text-sm">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? descId : undefined}
        className={`bg-surface-1 text-text min-h-12 rounded-[var(--radius-sm)] border px-4 text-base disabled:opacity-50 ${error ? 'border-bear' : 'border-line'} ${className}`}
        {...rest}
      />
      {(error || hint) && (
        <p id={descId} className={`text-sm ${error ? 'text-bear' : 'text-text-2'}`}>
          {error ? `Error: ${error}` : hint}
        </p>
      )}
    </div>
  );
}
