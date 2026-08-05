import { useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Modal } from '@/components/common/Modal';
import { GenericCrudForm, type FieldSchema } from '@/components/forms/GenericCrudForm';
import { DataTable } from '@/components/tables/DataTable';
import { useAdminGameweeks, useUpdateAdminGameweek } from '@/hooks/useContentAdmin';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type { AdminGameweek, UpdateGameweekBody } from '@/types/content';

const gameweekFields: FieldSchema[] = [
  { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'UPCOMING', label: 'Upcoming' },
      { value: 'LIVE', label: 'Live' },
      { value: 'FINISHED', label: 'Finished' },
    ],
  },
  { name: 'isCurrent', label: 'Current gameweek', type: 'checkbox' },
];

function statusBadge(status: AdminGameweek['status']) {
  if (status === 'LIVE') return <Badge variant="success">Live</Badge>;
  if (status === 'FINISHED') return <Badge variant="default">Finished</Badge>;
  return <Badge variant="warning">Upcoming</Badge>;
}

export function GameweeksManagePage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminGameweek | null>(null);
  const [pendingFinalize, setPendingFinalize] = useState<UpdateGameweekBody | null>(null);

  const toast = useToast();
  const updateMutation = useUpdateAdminGameweek();

  const { data, isLoading } = useAdminGameweeks({ page, limit: 50 });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 50, total: 0, totalPages: 1 };

  const submitUpdate = (body: UpdateGameweekBody) => {
    if (!selected) return;

    updateMutation.mutate(
      { id: selected.id, body },
      {
        onSuccess: (gameweek) => {
          setSelected(gameweek);
          setPendingFinalize(null);
          toast.success('Gameweek updated');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update gameweek'));
        },
      },
    );
  };

  const handleSave = (values: Record<string, unknown>) => {
    const body: UpdateGameweekBody = {
      deadline: values.deadline as string,
      status: values.status as AdminGameweek['status'],
      isCurrent: values.isCurrent as boolean,
    };

    if (selected && body.status === 'FINISHED' && selected.status !== 'FINISHED') {
      setPendingFinalize(body);
      return;
    }

    submitUpdate(body);
  };

  return (
    <>
      <DataTable<AdminGameweek>
        columns={[
          { key: 'number', label: 'GW', render: (row) => row.number },
          {
            key: 'deadline',
            label: 'Deadline',
            render: (row) => new Date(row.deadline).toLocaleString(),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => statusBadge(row.status),
          },
          {
            key: 'isCurrent',
            label: 'Current',
            render: (row) =>
              row.isCurrent ? <Badge variant="success">Current</Badge> : <span>—</span>,
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
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Edit Gameweek ${selected.number}` : 'Edit gameweek'}
      >
        {selected ? (
          <GenericCrudForm
            fields={gameweekFields}
            initialValues={{
              deadline: selected.deadline,
              status: selected.status,
              isCurrent: selected.isCurrent,
            }}
            onSubmit={handleSave}
            isLoading={updateMutation.isPending}
            submitLabel="Save changes"
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingFinalize !== null}
        title="Finalize gameweek?"
        description="Setting status to Finished will trigger the scoring engine for this gameweek. This cannot be easily undone."
        confirmLabel="Finalize"
        confirmVariant="danger"
        onConfirm={() => {
          if (pendingFinalize) {
            submitUpdate(pendingFinalize);
          }
        }}
        onCancel={() => setPendingFinalize(null)}
        isLoading={updateMutation.isPending}
      />
    </>
  );
}
