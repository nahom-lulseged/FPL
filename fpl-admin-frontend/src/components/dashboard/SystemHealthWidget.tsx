import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Badge } from '@/components/common/Badge';
import { formatRelativeTime } from '@/lib/formatters';

interface SystemHealthWidgetProps {
  dbConnectionOk: boolean;
  redisConnectionOk: boolean;
  lastSyncAt: string | null;
  lastSyncSuccess: boolean | null;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={clsx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', ok ? 'bg-fpl-green' : 'bg-fpl-pink')}
      aria-hidden
    />
  );
}

function HealthRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <StatusDot ok={ok} />
        <span className="text-sm font-medium text-fpl-gray-900">{label}</span>
      </div>
      {detail ?? (
        <Badge variant={ok ? 'success' : 'danger'}>{ok ? 'Connected' : 'Unavailable'}</Badge>
      )}
    </div>
  );
}

export function SystemHealthWidget({
  dbConnectionOk,
  redisConnectionOk,
  lastSyncAt,
  lastSyncSuccess,
}: SystemHealthWidgetProps) {
  const syncOk = lastSyncSuccess === true;
  const syncFailed = lastSyncSuccess === false;

  return (
    <div className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-fpl-gray-900">System Health</h2>
      <div className="mt-2 divide-y divide-fpl-gray-100">
        <HealthRow label="Database" ok={dbConnectionOk} />
        <HealthRow label="Redis" ok={redisConnectionOk} />
        <HealthRow
          label="Last ingestion sync"
          ok={syncOk}
          detail={
            <div className="flex flex-col items-end gap-1">
              {lastSyncAt ? (
                <span className="text-xs text-fpl-gray-500">{formatRelativeTime(lastSyncAt)}</span>
              ) : (
                <span className="text-xs text-fpl-gray-500">Never synced</span>
              )}
              {syncFailed ? <Badge variant="danger">Failed</Badge> : null}
              {syncOk ? <Badge variant="success">Success</Badge> : null}
              {!lastSyncAt ? <Badge variant="warning">Pending</Badge> : null}
            </div>
          }
        />
      </div>
    </div>
  );
}
