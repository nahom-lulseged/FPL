import { useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { GenericCrudForm, type FieldSchema } from '@/components/forms/GenericCrudForm';
import { DataTable } from '@/components/tables/DataTable';
import {
  useAdminFixtures,
  useAdminGameweeks,
  useAdminRealTeams,
  useUpdateAdminFixture,
} from '@/hooks/useContentAdmin';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type { AdminFixture } from '@/types/content';

const fixtureFields: FieldSchema[] = [
  { name: 'kickoffTime', label: 'Kickoff time', type: 'datetime-local', required: true },
  { name: 'isPostponed', label: 'Postponed', type: 'checkbox' },
];

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function FixturesManagePage() {
  const [page, setPage] = useState(1);
  const [gameweek, setGameweek] = useState('');
  const [teamId, setTeamId] = useState('');
  const [postponedFilter, setPostponedFilter] = useState<'' | 'true' | 'false'>('');
  const [selected, setSelected] = useState<AdminFixture | null>(null);

  const toast = useToast();
  const updateMutation = useUpdateAdminFixture();

  const { data: teamsData } = useAdminRealTeams({ page: 1, limit: 100 });
  const { data: gameweeksData } = useAdminGameweeks({ page: 1, limit: 50 });
  const { data, isLoading } = useAdminFixtures({
    page,
    limit: 20,
    ...(gameweek ? { gameweek: Number(gameweek) } : {}),
    ...(teamId ? { teamId } : {}),
    ...(postponedFilter !== '' ? { isPostponed: postponedFilter === 'true' } : {}),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const handleSave = (values: Record<string, unknown>) => {
    if (!selected) return;

    updateMutation.mutate(
      {
        id: selected.id,
        body: {
          kickoffTime: values.kickoffTime as string,
          isPostponed: values.isPostponed as boolean,
        },
      },
      {
        onSuccess: (fixture) => {
          setSelected(fixture);
          toast.success('Fixture updated');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update fixture'));
        },
      },
    );
  };

  return (
    <>
      <DataTable<AdminFixture>
        columns={[
          {
            key: 'match',
            label: 'Match',
            render: (row) => `${row.homeTeam.shortName} vs ${row.awayTeam.shortName}`,
          },
          {
            key: 'gameweek',
            label: 'GW',
            render: (row) => row.gameweek.number,
          },
          {
            key: 'kickoffTime',
            label: 'Kickoff',
            render: (row) => formatKickoff(row.kickoffTime),
          },
          {
            key: 'score',
            label: 'Score',
            render: (row) => {
              if (!row.started && !row.finished) {
                return <span>—</span>;
              }
              const score = `${row.homeScore ?? 0}-${row.awayScore ?? 0}`;
              if (row.started && !row.finished) {
                return (
                  <span>
                    {score}{' '}
                    <Badge variant="success">
                      LIVE{row.minutes != null ? ` ${row.minutes}'` : ''}
                    </Badge>
                  </span>
                );
              }
              return <span>{score} FT</span>;
            },
          },
          {
            key: 'postponed',
            label: 'Postponed',
            render: (row) =>
              row.isPostponed ? <Badge variant="warning">Postponed</Badge> : <span>—</span>,
          },
          {
            key: 'override',
            label: 'Override',
            render: (row) =>
              row.isManualOverride ? <Badge variant="warning">Manual</Badge> : <span>—</span>,
          },
        ]}
        data={rows}
        meta={meta}
        onPageChange={setPage}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        onRowClick={setSelected}
        filters={
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gwFilter" className="text-sm font-medium text-fpl-gray-900">
                Gameweek
              </label>
              <select
                id="gwFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm"
                value={gameweek}
                onChange={(event) => {
                  setGameweek(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {(gameweeksData?.data ?? []).map((gw) => (
                  <option key={gw.id} value={gw.number}>
                    GW{gw.number}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fixtureTeamFilter" className="text-sm font-medium text-fpl-gray-900">
                Team
              </label>
              <select
                id="fixtureTeamFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm"
                value={teamId}
                onChange={(event) => {
                  setTeamId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {(teamsData?.data ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="postponedFilter" className="text-sm font-medium text-fpl-gray-900">
                Postponed
              </label>
              <select
                id="postponedFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm"
                value={postponedFilter}
                onChange={(event) => {
                  setPostponedFilter(event.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Postponed only</option>
                <option value="false">Not postponed</option>
              </select>
            </div>
          </div>
        }
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `Edit ${selected.homeTeam.shortName} vs ${selected.awayTeam.shortName}`
            : 'Edit fixture'
        }
      >
        {selected ? (
          <GenericCrudForm
            fields={fixtureFields}
            initialValues={{
              kickoffTime: selected.kickoffTime,
              isPostponed: selected.isPostponed,
            }}
            onSubmit={handleSave}
            isLoading={updateMutation.isPending}
            submitLabel="Save changes"
          />
        ) : null}
      </Modal>
    </>
  );
}
