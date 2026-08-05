import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconReset({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10a5.5 5.5 0 019.7-3.5M15.5 10a5.5 5.5 0 01-9.7 3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M14.5 3.5v3.5H11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 16.5v-3.5H9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2.5l2.2 4.45 4.9.71-3.55 3.46.84 4.88L10 13.7l-4.39 2.3.84-4.88L2.9 7.66l4.9-.71L10 2.5z" />
    </svg>
  );
}

export function IconStarOutline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5l2.2 4.45 4.9.71-3.55 3.46.84 4.88L10 13.7l-4.39 2.3.84-4.88L2.9 7.66l4.9-.71L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Toggle star for player watchlist (outline ↔ filled). */
export function FplWatchlistButton({
  watched,
  playerName,
  className,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  watched: boolean;
  playerName: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={watched}
      aria-label={watched ? `Remove ${playerName} from watchlist` : `Add ${playerName} to watchlist`}
      onClick={onClick}
      className={clsx(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10',
        watched ? 'text-fpl-cyan' : 'text-white/55 hover:text-white',
        className,
      )}
      {...props}
    >
      {watched ? <IconStar className="h-4 w-4" /> : <IconStarOutline className="h-4 w-4" />}
    </button>
  );
}

/** Circular outline info (i) control — FPL player row */
export function FplInfoButton({
  label = 'Player info',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={clsx(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/55 text-white/85 transition hover:border-white hover:text-white',
        className,
      )}
      {...props}
    >
      <IconInfo className="h-4 w-4" />
    </button>
  );
}

/** Circular + / × control — FPL player row */
export function FplAddRemoveButton({
  mode,
  disabled,
  playerName,
  className,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  mode: 'add' | 'remove';
  playerName: string;
}) {
  return (
    <button
      type="button"
      aria-label={mode === 'remove' ? `Remove ${playerName}` : `Add ${playerName}`}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={clsx(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition sm:h-11 sm:w-11',
        mode === 'remove'
          ? 'bg-[#5a1d6e] text-white hover:bg-fpl-pink'
          : disabled
            ? 'cursor-not-allowed bg-white/10 text-white/25'
            : 'bg-[#5a1d6e] text-white ring-1 ring-white/30 hover:bg-[#6e2588] hover:ring-white/50',
        className,
      )}
      {...props}
    >
      {mode === 'remove' ? (
        <IconClose className="h-4 w-4" />
      ) : (
        <IconPlus className="h-5 w-5" />
      )}
    </button>
  );
}

/** Pill filter / reset chrome used in player selection */
export function FplFilterPill({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-10 items-center gap-1.5 rounded-full border border-white/35 bg-[#2a0033] px-3.5 text-sm font-medium text-white transition hover:border-white/55 hover:bg-[#3a0045]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
