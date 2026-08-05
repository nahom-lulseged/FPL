import clsx from 'clsx';

interface AutoSubBadgeProps {
  wasSubstitutedIn?: boolean | null;
  wasSubstitutedOut?: boolean | null;
  className?: string;
}

export function AutoSubBadge({
  wasSubstitutedIn,
  wasSubstitutedOut,
  className,
}: AutoSubBadgeProps) {
  if (!wasSubstitutedIn && !wasSubstitutedOut) {
    return null;
  }

  return (
    <span
      className={clsx(
        'absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide',
        wasSubstitutedIn && 'bg-fpl-green/90 text-white',
        wasSubstitutedOut && 'bg-fpl-pink/90 text-white',
        className,
      )}
    >
      {wasSubstitutedIn ? 'Sub in' : 'Sub out'}
    </span>
  );
}
