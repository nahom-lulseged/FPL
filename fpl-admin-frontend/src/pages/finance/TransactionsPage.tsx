import { useState } from 'react';
import type { TransactionKind, TransactionRow } from '@/api/adminFinance.api';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { useTransactions } from '@/hooks/useFinance';
import { formatDate } from '@/lib/formatters';

type TypeFilter = 'all' | TransactionKind;

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
    case 'REJECTED':
      return 'danger';
    default:
      return 'default';
  }
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-fpl-gray-500">{label}</dt>
      <dd className="mt-0.5 break-all text-sm text-fpl-gray-900">{value}</dd>
    </div>
  );
}

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<TransactionRow | null>(null);

  const { data, isLoading } = useTransactions({ type, page, limit: 20 });
  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const columns: DataTableColumn<TransactionRow>[] = [
    {
      key: 'kind',
      label: 'Type',
      render: (row) => (row.kind === 'deposit' ? 'Deposit' : 'Withdraw'),
    },
    {
      key: 'user',
      label: 'User',
      render: (row) => row.user.email,
    },
    {
      key: 'amountMinor',
      label: 'Amount',
      render: (row) => `${(row.amountMinor / 100).toFixed(2)} ETB`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (row) => row.provider,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'view',
      label: '',
      render: (row) => (
        <Button
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            setSelected(row);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  const filters = (
    <div className="max-w-xs">
      <label htmlFor="tx-type" className="mb-1 block text-sm font-medium text-fpl-gray-700">
        Type
      </label>
      <select
        id="tx-type"
        value={type}
        onChange={(event) => {
          setType(event.target.value as TypeFilter);
          setPage(1);
        }}
        className="w-full rounded-md border border-fpl-gray-300 px-3 py-2 text-sm"
      >
        <option value="all">All</option>
        <option value="deposit">Deposit</option>
        <option value="withdraw">Withdraw</option>
      </select>
    </div>
  );

  return (
    <div className="mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-fpl-gray-900">Transactions</h2>
        <p className="mt-1 text-sm text-fpl-gray-500">
          Deposit and withdrawal request history
        </p>
      </div>

      <DataTable<TransactionRow>
        columns={columns}
        data={rows}
        meta={meta}
        onPageChange={setPage}
        filters={filters}
        getRowId={(row) => `${row.kind}-${row.id}`}
        onRowClick={setSelected}
        isLoading={isLoading}
        emptyMessage="No transactions found."
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Transaction detail"
        className="max-w-lg"
      >
        {selected ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField label="ID" value={selected.id} />
            <DetailField
              label="Type"
              value={selected.kind === 'deposit' ? 'Deposit' : 'Withdraw'}
            />
            <DetailField label="User email" value={selected.user.email} />
            <DetailField label="Display name" value={selected.user.displayName} />
            <DetailField
              label="Amount"
              value={`${(selected.amountMinor / 100).toFixed(2)} ETB`}
            />
            <DetailField label="Status" value={selected.status} />
            <DetailField label="Provider" value={selected.provider} />
            <DetailField
              label="Provider ref"
              value={selected.paymentProviderRef ?? '—'}
            />
            <DetailField
              label="Rejection reason"
              value={selected.rejectionReason ?? '—'}
            />
            {selected.kind === 'deposit' ? (
              <DetailField
                label="Idempotency key"
                value={selected.idempotencyKey ?? '—'}
              />
            ) : (
              <DetailField
                label="KYC verified at"
                value={
                  selected.kycVerifiedAt ? formatDate(selected.kycVerifiedAt) : '—'
                }
              />
            )}
            <DetailField label="Created" value={formatDate(selected.createdAt)} />
            <DetailField label="Updated" value={formatDate(selected.updatedAt)} />
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
