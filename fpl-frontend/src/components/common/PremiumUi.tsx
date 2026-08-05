import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { PremiumCard } from './PremiumCard';

export function GradientPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('gradient-panel', className)} {...props} />;
}

export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('section-header', className)}>
      <div>{eyebrow ? <small>{eyebrow}</small> : null}<h2>{title}</h2></div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'purple',
  detail,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: ColorTone;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <PremiumCard className={clsx('stat-card', `stat-card--${tone}`, className)}>
      <ColorToken tone={tone}><Icon size={18} /></ColorToken>
      <small>{label}</small>
      <strong>{value}</strong>
      {detail ? <div className="stat-card__detail">{detail}</div> : null}
    </PremiumCard>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  label,
  onChange,
  className,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; icon?: LucideIcon }>;
  label: string;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx('premium-segmented', className)} role="tablist" aria-label={label}>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => (
        <button
          key={optionValue}
          type="button"
          role="tab"
          aria-selected={value === optionValue}
          className={value === optionValue ? 'is-active' : undefined}
          onClick={() => onChange(optionValue)}
        >
          {Icon ? <Icon size={17} /> : null}{optionLabel}
        </button>
      ))}
    </div>
  );
}

export type ColorTone = 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'muted';

export function ColorToken({
  tone,
  children,
  className,
}: {
  tone: ColorTone;
  children?: ReactNode;
  className?: string;
}) {
  return <span className={clsx('color-token', `color-token--${tone}`, className)}>{children}</span>;
}
