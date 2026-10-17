/** Mano animada del tutorial jugable (primera vez): señala dónde tocar. Decorativa; la guía va también en texto. */
export function HandPointer({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      className={`kit-hand pointer-events-none absolute ${className}`}
    >
      <path
        d="M12 4a2 2 0 0 1 4 0v10l1.5-.5a2 2 0 0 1 2.4 1l.4-.2a2 2 0 0 1 2.4 1.2 2 2 0 0 1 2.3 1.3L26 25a5 5 0 0 1-5 4h-4a6 6 0 0 1-4.7-2.3L8 21a2 2 0 0 1 3-2.6l1 1z"
        fill="var(--text)"
        stroke="var(--bg)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
