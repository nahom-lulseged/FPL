import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        variant === 'default' && 'bg-fpl-gray-200 text-fpl-gray-900',
        variant === 'success' && 'bg-fpl-green/20 text-fpl-gray-900',
        variant === 'warning' && 'bg-fpl-cyan/20 text-fpl-gray-900',
        variant === 'danger' && 'bg-fpl-pink/20 text-fpl-pink',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
