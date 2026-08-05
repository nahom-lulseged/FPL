import { useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { DataTable } from '@/components/tables/DataTable';
import {
  useRecalculationHistory,
  useRecalculationHistoryEntry,
} from '@/hooks/useScoring';
import type { RecalculationHistoryItem, TeamScoreDiff } from '@/types/scoring';

function typeBadge(type: RecalculationHistoryItem['type']) {
  if (type === 'CORRECTION') {
    return <Badge variant="warning">Correction</Badge>;
  }
  return <Badge variant="default">Full recalc</Badge>;
}

const listColumns = [
  {
    key: 'createdAt',
    label: 'When',
    render: (row: RecalculationHistoryItem) =>
      new Date(row.createdAt).toLocaleString(),
  },
  {
    key: 'gameweekNumber',
    label: 'GW',
    render: (row: RecalculationHistoryItem) => `GW${row.gameweekNumber}`,
  },
  {
    key: 'type',
    label: 'Type',
    render: (row: RecalculationHistoryItem) => typeBadge(row.type),
  },
  { key: 'teamsAffected', label: 'Teams' },
  {
    key: 'admin',
    label: 'Admin',
    render: (row: RecalculationHistoryItem) => row.admin.displayName,
  },
  {
    key: 'reason',
    label: 'Reason',
    render: (row: RecalculationHistoryItem) => row.reason ?? '—',
  },
];

const diffColumns = [
  { key: 'teamName', label: 'Team' },
  { key: 'oldPoints', label: 'Old' },
  { key: 'newPoints', label: 'New' },
  {
    key: 'delta',
    label: 'Delta',
    render: (row: TeamScoreDiff) => (
      <span className={row.delta >= 0 ? 'text-green-700' : 'text-red-700'}>
        {row.delta > 0 ? `+${row.delta}` : row.delta}
      </span>
    ),
  },
];

export function RecalculationHistoryPage() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useRecalculationHistory({ page, limit: 20 });
  const { data: detail } = useRecalculationHistoryEntry(selectedId);

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <>
      <DataTable
        columns={listColumns}
        data={rows}
        meta={meta}
        onPageChange={setPage}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        isLoading={isLoading}
        emptyMessage="No recalculation events yet"
      />

      <Modal
        open={Boolean(selectedId && detail)}
        onClose={() => setSelectedId(null)}
        title={
          detail
            ? `GW${detail.gameweekNumber} — ${detail.type === 'CORRECTION' ? 'Correction' : 'Recalculation'}`
            : 'Event detail'
        }
      >
        {detail ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-fpl-gray-500">Admin</dt>
              <dd>{detail.admin.displayName}</dd>
              <dt className="text-fpl-gray-500">When</dt>
              <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
              <dt className="text-fpl-gray-500">Reason</dt>
              <dd>{detail.reason ?? '—'}</dd>
              <dt className="text-fpl-gray-500">Teams affected</dt>
              <dd>{detail.teamsAffected}</dd>
            </dl>

            <DataTable
              columns={diffColumns}
              data={detail.diffs}
              meta={{
                page: 1,
                limit: detail.diffs.length,
                total: detail.diffs.length,
                totalPages: 1,
              }}
              onPageChange={() => {}}
              getRowId={(row) => row.teamId}
              emptyMessage="No team deltas recorded"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
