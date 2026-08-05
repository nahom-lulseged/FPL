import clsx from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leadingIcon?: ReactNode;
  hideLabel?: boolean;
  labelBold?: boolean;
  variant?: 'default' | 'outline';
}

export function Input({
  label,
  error,
  id,
  className,
  leadingIcon,
  hideLabel,
  labelBold,
  variant = 'default',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const isOutline = variant === 'outline';
  const inputClassName = clsx(
    'w-full rounded-lg border py-3 text-base text-white placeholder:text-white/45 focus:border-fpl-cyan focus:outline-none focus:ring-1 focus:ring-fpl-cyan',
    leadingIcon ? 'pl-14 pr-3' : 'px-3',
    isOutline
      ? 'border-white/40 bg-transparent'
      : 'border-white/25 bg-[#1a0024]',
    error ? 'border-fpl-pink' : null,
    className,
  );

  return (
    <div className="flex flex-col gap-1.5">
      {hideLabel ? (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      ) : (
        <label htmlFor={inputId} className={clsx('text-base text-white/90', labelBold && 'font-extrabold text-white')}>
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/80">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={inputClassName}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-fpl-pink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
