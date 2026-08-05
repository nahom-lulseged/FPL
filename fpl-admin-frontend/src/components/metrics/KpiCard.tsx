import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface KpiTrend {
  direction: 'up' | 'down' | 'flat';
  label?: string;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: KpiTrend;
  children?: ReactNode;
  className?: string;
}

const trendColors: Record<KpiTrend['direction'], string> = {
  up: 'text-fpl-green',
  down: 'text-fpl-pink',
  flat: 'text-fpl-gray-500',
};

const trendArrows: Record<KpiTrend['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function KpiCard({ label, value, icon, trend, children, className }: KpiCardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fpl-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-fpl-gray-900">{value}</p>
          {trend ? (
            <p className={clsx('mt-1 text-xs font-medium', trendColors[trend.direction])}>
              {trendArrows[trend.direction]} {trend.label ?? trend.direction}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-fpl-purple/10 text-fpl-purple">
            {icon}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
