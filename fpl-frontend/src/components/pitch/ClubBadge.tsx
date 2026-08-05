import clsx from 'clsx';
import { getJerseyDataUri } from '@/lib/clubJersey';

interface ClubBadgeProps {
  shortName: string;
  playerName: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ClubBadge({ shortName, size = 'md', className }: ClubBadgeProps) {
  return (
    <img
      src={getJerseyDataUri(shortName)}
      alt=""
      aria-hidden="true"
      className={clsx(
        'shrink-0 object-contain',
        size === 'sm' ? 'h-10 w-10' : 'h-12 w-12',
        className,
      )}
    />
  );
}
