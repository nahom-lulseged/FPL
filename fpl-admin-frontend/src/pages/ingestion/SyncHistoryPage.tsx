import { useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { IngestionSubNav } from '@/components/ingestion/IngestionSubNav';
import { DataTable } from '@/components/tables/DataTable';
import { useSyncHistory } from '@/hooks/useSyncHistory';
import { formatDate } from '@/lib/formatters';
import type { SyncLogRow, SyncType } from '@/types/ingestionStatus';

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

const syncTypeOptions: { value: '' | SyncType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'ALL', label: 'All (full)' },
  { value: 'TEAMS', label: 'Teams' },
  { value: 'PLAYERS', label: 'Players' },
  { value: 'FIXTURES', label: 'Fixtures' },
  { value: 'GAMEWEEKS', label: 'Gameweeks' },
];

export function SyncHistoryPage() {
  const [page, setPage] = useState(1);
  const [syncType, setSyncType] = useState<'' | SyncType>('');
  const [successFilter, setSuccessFilter] = useState<'' | 'true' | 'false'>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data, isLoading } = useSyncHistory({
    page,
    limit: 20,
    ...(syncType ? { syncType } : {}),
    ...(successFilter !== '' ? { success: successFilter === 'true' } : {}),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div>
      <h1 className="text-xl font-bold text-fpl-gray-900">Sync History</h1>
      <p className="mt-1 text-sm text-fpl-gray-500">Audit log of all ingestion sync runs</p>

      <IngestionSubNav />

      <DataTable<SyncLogRow>
        columns={[
          {
            key: 'startedAt',
            label: 'Started',
            render: (row) => formatDate(row.startedAt),
          },
          {
            key: 'durationMs',
            label: 'Duration',
            render: (row) => formatDuration(row.durationMs),
          },
          {
            key: 'syncType',
            label: 'Type',
            render: (row) => row.syncType,
          },
          {
            key: 'rowsChanged',
            label: 'Rows Changed',
            render: (row) => row.rowsChanged,
          },
          {
            key: 'success',
            label: 'Status',
            render: (row) => (
              <Badge variant={row.success ? 'success' : 'danger'}>
                {row.success ? 'Success' : 'Failed'}
              </Badge>
            ),
          },
        ]}
        data={rows}
        meta={meta}
        onPageChange={setPage}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        expandedRowId={expandedRowId}
        onRowClick={(row) => {
          if (!row.success && row.errorMessage) {
            setExpandedRowId((current) => (current === row.id ? null : row.id));
          }
        }}
        expandableRow={(row) =>
          !row.success && row.errorMessage ? (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-fpl-pink">
              {row.errorMessage}
            </pre>
          ) : null
        }
        filters={
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-fpl-gray-500">
              Sync type
              <select
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900"
                value={syncType}
                onChange={(e) => {
                  setSyncType(e.target.value as '' | SyncType);
                  setPage(1);
                }}
              >
                {syncTypeOptions.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-fpl-gray-500">
              Result
              <select
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900"
                value={successFilter}
                onChange={(e) => {
                  setSuccessFilter(e.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Success only</option>
                <option value="false">Failed only</option>
              </select>
            </label>
          </div>
        }
      />
    </div>
  );
}
