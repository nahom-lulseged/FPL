import clsx from 'clsx';
import type { SelectHTMLAttributes } from 'react';
import { IconChevronDown } from '@/components/common/FplButtons';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  /** FPL pill filter style (rounded, bordered) */
  variant?: 'default' | 'pill';
}

export function Select({
  label,
  options,
  groups,
  className,
  id,
  variant = 'default',
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isPill = variant === 'pill';

  const selectEl = (
    <select
      id={selectId}
      className={clsx(
        'w-full appearance-none text-sm text-white focus:outline-none focus:ring-1 focus:ring-fpl-cyan',
        isPill
          ? 'h-9 rounded-lg border border-white/40 bg-transparent py-0 pl-3 pr-8 text-xs font-medium hover:border-white/60 sm:pl-3.5 sm:text-sm sm:pr-9'
          : 'rounded-md border border-white/20 bg-fpl-dark px-3 py-2 focus:border-fpl-cyan',
        className,
      )}
      {...props}
    >
      {options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {groups?.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={`${group.label}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  return (
    <label className="block text-sm" htmlFor={selectId}>
      {label && !isPill ? (
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/60">
          {label}
        </span>
      ) : null}
      {label && isPill ? <span className="sr-only">{label}</span> : null}
      {isPill ? (
        <span className="relative block">
          {selectEl}
          <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
        </span>
      ) : (
        selectEl
      )}
    </label>
  );
}
