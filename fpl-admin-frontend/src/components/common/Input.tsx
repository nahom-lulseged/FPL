import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const inputClassName = clsx(
    'rounded-md border bg-white px-3 py-2 text-sm text-fpl-gray-900 placeholder:text-fpl-gray-500 focus:border-fpl-purple focus:outline-none focus:ring-1 focus:ring-fpl-purple',
    error ? 'border-fpl-pink' : 'border-fpl-gray-200',
    className,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fpl-gray-900">
        {label}
      </label>
      {error ? (
        <input id={inputId} aria-invalid="true" className={inputClassName} {...props} />
      ) : (
        <input id={inputId} className={inputClassName} {...props} />
      )}
      {error ? <p className="text-xs text-fpl-pink">{error}</p> : null}
    </div>
  );
}
