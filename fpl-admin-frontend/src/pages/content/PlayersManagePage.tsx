import { useEffect, useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { GenericCrudForm, type FieldSchema } from '@/components/forms/GenericCrudForm';
import { DataTable } from '@/components/tables/DataTable';
import { CsvExportButton } from '@/components/tables/CsvExportButton';
import {
  useAdminPlayerDetail,
  useAdminPlayers,
  useAdminRealTeams,
  useSyncAdminPlayerSummary,
  useUpdateAdminPlayer,
} from '@/hooks/useContentAdmin';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type { AdminPlayer } from '@/types/content';

const playerFields: FieldSchema[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'price', label: 'Price (£)', type: 'number', numberFormat: 'price', step: '0.1', min: 0 },
  { name: 'isAvailable', label: 'Available for selection', type: 'checkbox' },
  { name: 'injuryNote', label: 'Injury note', type: 'textarea' },
];

function formatPrice(price: number): string {
  return `£${(price / 10).toFixed(1)}`;
}

export function PlayersManagePage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [teamId, setTeamId] = useState('');
  const [selected, setSelected] = useState<AdminPlayer | null>(null);

  const toast = useToast();
  const updateMutation = useUpdateAdminPlayer();
  const syncSummaryMutation = useSyncAdminPlayerSummary();
  const { data: detail, isLoading: detailLoading } = useAdminPlayerDetail(selected?.id);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data: teamsData } = useAdminRealTeams({ page: 1, limit: 100 });
  const { data, isLoading } = useAdminPlayers({
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(position ? { position } : {}),
    ...(teamId ? { teamId } : {}),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
  const history = detail?.history ?? [];
  const historyPast = detail?.historyPast ?? [];

  const handleSave = (values: Record<string, unknown>) => {
    if (!selected) return;

    updateMutation.mutate(
      {
        id: selected.id,
        body: {
          name: values.name as string,
          price: values.price as number,
          isAvailable: values.isAvailable as boolean,
          injuryNote: values.injuryNote as string | null,
        },
      },
      {
        onSuccess: (player) => {
          setSelected(player);
          toast.success('Player updated');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update player'));
        },
      },
    );
  };

  const handleSyncSummary = () => {
    if (!selected) return;
    syncSummaryMutation.mutate(selected.id, {
      onSuccess: () => toast.success('Element summary synced'),
      onError: (error) => toast.error(getErrorMessage(error, 'Summary sync failed')),
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <CsvExportButton entity="players" />
      </div>

      <DataTable<AdminPlayer>
        columns={[
          { key: 'name', label: 'Name', render: (row) => row.name },
          { key: 'position', label: 'Pos', render: (row) => row.position },
          {
            key: 'team',
            label: 'Team',
            render: (row) => row.realTeam.shortName,
          },
          {
            key: 'price',
            label: 'Price',
            render: (row) => formatPrice(row.price),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) =>
              row.isAvailable ? (
                <Badge variant="success">Available</Badge>
              ) : (
                <Badge variant="danger">Unavailable</Badge>
              ),
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
            <Input
              label="Search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Player name"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="positionFilter" className="text-sm font-medium text-fpl-gray-900">
                Position
              </label>
              <select
                id="positionFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm"
                value={position}
                onChange={(event) => {
                  setPosition(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="FWD">FWD</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="teamFilter" className="text-sm font-medium text-fpl-gray-900">
                Team
              </label>
              <select
                id="teamFilter"
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
          </div>
        }
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Edit ${selected.name}` : 'Edit player'}
      >
        {selected ? (
          <div className="space-y-6">
            <GenericCrudForm
              fields={playerFields}
              initialValues={{
                name: selected.name,
                price: selected.price,
                isAvailable: selected.isAvailable,
                injuryNote: selected.injuryNote ?? '',
              }}
              onSubmit={handleSave}
              isLoading={updateMutation.isPending}
              submitLabel="Save changes"
            />

            <div className="border-t border-fpl-gray-200 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-fpl-gray-900">Element summary</h3>
                <Button
                  variant="secondary"
                  isLoading={syncSummaryMutation.isPending}
                  onClick={handleSyncSummary}
                >
                  Sync element summary
                </Button>
              </div>
              {detailLoading ? (
                <p className="text-sm text-fpl-gray-500">Loading history…</p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-fpl-gray-500">
                    Season totals: {detail?.totalPoints ?? '—'} pts · GW {detail?.eventPoints ?? '—'}
                  </p>
                  <div className="max-h-48 overflow-auto rounded border border-fpl-gray-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-fpl-gray-50 text-fpl-gray-500">
                        <tr>
                          <th className="px-2 py-1">GW</th>
                          <th className="px-2 py-1">Opp</th>
                          <th className="px-2 py-1">Pts</th>
                          <th className="px-2 py-1">Mins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...history].reverse().slice(0, 12).map((row) => (
                          <tr key={row.gameweek} className="border-t border-fpl-gray-100">
                            <td className="px-2 py-1">{row.gameweek}</td>
                            <td className="px-2 py-1">
                              {row.opponent
                                ? `${row.wasHome ? 'H' : 'A'} ${row.opponent.shortName}`
                                : '—'}
                            </td>
                            <td className="px-2 py-1 font-medium">{row.points}</td>
                            <td className="px-2 py-1">{row.minutes}</td>
                          </tr>
                        ))}
                        {history.length === 0 ? (
                          <tr>
                            <td className="px-2 py-3 text-fpl-gray-500" colSpan={4}>
                              No GW history yet. Sync element summary to backfill.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  {historyPast.length > 0 ? (
                    <div className="mt-3 max-h-32 overflow-auto rounded border border-fpl-gray-200">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-fpl-gray-50 text-fpl-gray-500">
                          <tr>
                            <th className="px-2 py-1">Season</th>
                            <th className="px-2 py-1">Pts</th>
                            <th className="px-2 py-1">G</th>
                            <th className="px-2 py-1">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyPast.map((row) => (
                            <tr key={row.seasonName} className="border-t border-fpl-gray-100">
                              <td className="px-2 py-1">{row.seasonName}</td>
                              <td className="px-2 py-1 font-medium">{row.totalPoints}</td>
                              <td className="px-2 py-1">{row.goalsScored}</td>
                              <td className="px-2 py-1">{row.assists}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
