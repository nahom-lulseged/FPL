import clsx from 'clsx';
import { useState } from 'react';
import { getClubColor } from '@/lib/clubColors';
import { getClubCrestUrl } from '@/lib/clubCrests';

interface ClubCrestProps {
  shortName: string;
  className?: string;
}

/** Locally cached club crest with a readable colour/monogram fallback. */
export function ClubCrest({ shortName, className }: ClubCrestProps) {
  const [failed, setFailed] = useState(false);
  const src = getClubCrestUrl(shortName);
  const colors = getClubColor(shortName);

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={clsx(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold',
          className,
        )}
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {shortName.slice(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className={clsx('h-5 w-5 shrink-0 object-contain', className)}
    />
  );
}
