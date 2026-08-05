import clsx from 'clsx';

interface TeamLogoProps {
  alt?: string;
  className?: string;
  decorative?: boolean;
  eager?: boolean;
}

export const TEAM_LOGO_SRC = '/brand/fpl-team-logo.png';

export function TeamLogo({
  alt = 'Fantasy Ethiopia team logo',
  className,
  decorative = false,
  eager = false,
}: TeamLogoProps) {
  return (
    <img
      src={TEAM_LOGO_SRC}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      className={clsx('fpl-team-logo-image', className)}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
