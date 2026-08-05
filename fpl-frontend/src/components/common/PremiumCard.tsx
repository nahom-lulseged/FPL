import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export type PremiumCardVariant = 'surface' | 'elevated' | 'glass' | 'gradient';

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PremiumCardVariant;
  interactive?: boolean;
  glow?: boolean;
}

export function PremiumCard({
  className,
  variant = 'surface',
  interactive = false,
  glow = false,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={clsx(
        'premium-card',
        `premium-card--${variant}`,
        interactive && 'premium-card--interactive',
        glow && 'premium-card--glow',
        className,
      )}
      {...props}
    />
  );
}

export const Card = PremiumCard;
