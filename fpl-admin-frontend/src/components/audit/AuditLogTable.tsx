import { useState } from 'react';
import clsx from 'clsx';
import { Badge } from '@/components/common/Badge';
import { JsonDiffViewer } from '@/components/diff/JsonDiffViewer';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { formatDate, formatRelativeTime } from '@/lib/formatters';
import type { AuditLogEntry } from '@/types/auditLog';

function formatActionLabel(action: string): string {
  return action.replace(/_/g, ' ');
}

interface AuditLogTableProps {
  data: AuditLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  page: number;
  onPageChange: (page: number) => void;
  filters?: React.ReactNode;
  isLoading?: boolean;
}

export function AuditLogTable({
  data,
  meta,
  page,
  onPageChange,
  filters,
  isLoading = false,
}: AuditLogTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      label: 'When',
      render: (row) => (
        <div>
          <p className="font-medium text-fpl-gray-900">{formatRelativeTime(row.createdAt)}</p>
          <p className="text-xs text-fpl-gray-500">{formatDate(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'admin',
      label: 'Admin',
      render: (row) => (
        <div>
          <p className="font-medium text-fpl-gray-900">{row.admin.displayName}</p>
          <p className="text-xs text-fpl-gray-500">{row.admin.email}</p>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <Badge variant="default">{formatActionLabel(row.action)}</Badge>
      ),
    },
    {
      key: 'target',
      label: 'Target',
      render: (row) => (
        <div>
          <p className="font-medium text-fpl-gray-900">{row.targetType}</p>
          <p className="truncate text-xs text-fpl-gray-500 max-w-[12rem]" title={row.targetId}>
            {row.targetId}
          </p>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      meta={{ ...meta, page }}
      onPageChange={onPageChange}
      filters={filters}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      expandedRowId={expandedRowId}
      onRowClick={(row) =>
        setExpandedRowId((current) => (current === row.id ? null : row.id))
      }
      expandableRow={(row) => (
        <div className="space-y-4 p-4">
          <JsonDiffViewer
            title="Change details"
            before={row.beforeJson}
            after={row.afterJson ?? {}}
          />
        </div>
      )}
      emptyMessage="No audit log entries found."
    />
  );
}

interface AuditActivityFeedProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
}

export function AuditActivityFeed({ entries, isLoading = false }: AuditActivityFeedProps) {
  if (isLoading) {
    return <p className="text-sm text-fpl-gray-500">Loading recent activity…</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-fpl-gray-500">
        No admin actions recorded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-fpl-gray-100">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm text-fpl-gray-900">
              <span className="font-medium">{entry.admin.displayName}</span>
              {' · '}
              <span className="text-fpl-purple">{formatActionLabel(entry.action)}</span>
              {' on '}
              <span className="font-medium">{entry.targetType}</span>
            </p>
            <p className="truncate text-xs text-fpl-gray-500">{entry.targetId}</p>
          </div>
          <time
            className={clsx('shrink-0 text-xs text-fpl-gray-500')}
            dateTime={entry.createdAt}
            title={formatDate(entry.createdAt)}
          >
            {formatRelativeTime(entry.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
