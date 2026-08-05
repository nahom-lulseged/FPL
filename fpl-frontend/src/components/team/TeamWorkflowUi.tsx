import clsx from 'clsx';
import { CalendarDays, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Gameweek } from '@/types/gameweek';
import { formatWorkflowDeadline } from './teamWorkflowFormatting';

export function WorkflowHeader({
  title,
  titleId,
  leading,
  trailing,
  className,
}: {
  title: string;
  titleId?: string;
  leading: ReactNode;
  trailing: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('team-workflow-header', className)}>
      <div className="team-workflow-header-slot">{leading}</div>
      <h1 id={titleId}>{title}</h1>
      <div className="team-workflow-header-slot team-workflow-header-slot--trailing">{trailing}</div>
    </div>
  );
}

export function WorkflowDeadlineLine({
  gameweek,
  fallbackNumber,
}: {
  gameweek?: Gameweek | null;
  fallbackNumber?: number | null;
}) {
  const value = formatWorkflowDeadline(gameweek, fallbackNumber);
  const countdown = useDeadlineCountdown(gameweek?.deadline);
  return (
    <section className="fpl-deadline-line" aria-label={`${value.gameweek ?? ''} ${value.deadline}`}>
      <span className="workflow-deadline-icon" aria-hidden="true"><CalendarDays /></span>
      <span className="workflow-deadline-copy">
        {value.gameweek ? <small>{value.gameweek}</small> : null}
        <span>Deadline</span>
        <strong>{value.deadlineValue}</strong>
      </span>
      <span className="workflow-countdown" aria-label="Time remaining">
        <span><strong>{countdown.days}</strong><small>Days</small></span>
        <span><strong>{countdown.hours}</strong><small>Hours</small></span>
        <span><strong>{countdown.minutes}</strong><small>Mins</small></span>
      </span>
    </section>
  );
}

function useDeadlineCountdown(deadline?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return useMemo(() => {
    const remaining = deadline ? Math.max(0, new Date(deadline).getTime() - now) : 0;
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
    };
  }, [deadline, now]);
}

export function WorkflowSegmentedControl<T extends string>({
  value,
  options,
  label,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  label: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="fpl-segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'is-active' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type WorkflowChipState = 'available' | 'active' | 'selected' | 'used' | 'unavailable';

export function WorkflowChipCard({
  icon: Icon,
  title,
  state,
  onClick,
  disabledReason,
}: {
  icon: LucideIcon;
  title: string;
  state: WorkflowChipState;
  onClick?: () => void;
  disabledReason?: string;
}) {
  const status = state === 'used' ? 'Used' : state[0]!.toUpperCase() + state.slice(1);
  const interactive = Boolean(onClick) && (state === 'available' || state === 'active' || state === 'selected');
  return (
    <button
      type="button"
      className={state === 'active' || state === 'selected' ? 'is-active' : undefined}
      disabled={!interactive}
      onClick={interactive ? onClick : undefined}
      title={disabledReason}
      aria-label={`${title} ${status.toLowerCase()}${disabledReason ? `, ${disabledReason}` : ''}`}
    >
      <span className="pick-team-chip-icon" aria-hidden="true"><Icon /></span>
      <strong>{title}</strong>
      <span>{status}</span>
    </button>
  );
}

export function WorkflowStickyActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx('transfer-sticky-actions', className)}>{children}</div>;
}
