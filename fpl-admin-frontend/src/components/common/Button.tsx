import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from '@/components/common/Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'premium-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'button-primary text-white focus-visible:outline-fpl-purple',
        variant === 'secondary' &&
          'button-secondary text-fpl-gray-900 focus-visible:outline-fpl-gray-500',
        variant === 'success' && 'button-success text-slate-950 focus-visible:outline-emerald-400',
        variant === 'danger' &&
          'bg-fpl-pink text-white hover:bg-fpl-pink/90 focus-visible:outline-fpl-pink',
        variant === 'ghost' &&
          'border border-white/20 bg-transparent text-white hover:bg-white/10 focus-visible:outline-white/50',
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
}
