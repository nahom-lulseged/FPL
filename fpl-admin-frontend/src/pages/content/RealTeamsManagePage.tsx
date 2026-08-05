import { useEffect, useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { GenericCrudForm, type FieldSchema } from '@/components/forms/GenericCrudForm';
import { DataTable } from '@/components/tables/DataTable';
import { useAdminRealTeams, useUpdateAdminRealTeam } from '@/hooks/useContentAdmin';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type { AdminRealTeam } from '@/types/content';

const teamFields: FieldSchema[] = [
  { name: 'shortName', label: 'Short name', type: 'text', required: true },
  { name: 'crestUrl', label: 'Crest URL', type: 'url' },
];

export function RealTeamsManagePage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminRealTeam | null>(null);

  const toast = useToast();
  const updateMutation = useUpdateAdminRealTeam();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading } = useAdminRealTeams({
    page,
    limit: 20,
    ...(search ? { search } : {}),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const handleSave = (values: Record<string, unknown>) => {
    if (!selected) return;

    updateMutation.mutate(
      {
        id: selected.id,
        body: {
          shortName: values.shortName as string,
          crestUrl: values.crestUrl as string | null,
        },
      },
      {
        onSuccess: (team) => {
          setSelected(team);
          toast.success('Team updated');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update team'));
        },
      },
    );
  };

  return (
    <>
      <DataTable<AdminRealTeam>
        columns={[
          { key: 'name', label: 'Name', render: (row) => row.name },
          { key: 'shortName', label: 'Short', render: (row) => row.shortName },
          {
            key: 'crestUrl',
            label: 'Crest',
            render: (row) =>
              row.crestUrl ? (
                <a href={row.crestUrl} className="text-fpl-purple hover:underline" target="_blank" rel="noreferrer">
                  View
                </a>
              ) : (
                '—'
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
          <Input
            label="Search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Team name or short name"
          />
        }
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Edit ${selected.name}` : 'Edit team'}
      >
        {selected ? (
          <GenericCrudForm
            fields={teamFields}
            initialValues={{
              shortName: selected.shortName,
              crestUrl: selected.crestUrl ?? '',
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
