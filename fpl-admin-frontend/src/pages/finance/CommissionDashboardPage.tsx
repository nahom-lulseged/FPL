import { Button } from '@/components/common/Button';
import { useCommissionDashboard, useFinanceMutations } from '@/hooks/useFinance';

export function CommissionDashboardPage() {
  const { data, isLoading } = useCommissionDashboard();
  const { runReconciliation } = useFinanceMutations();

  if (isLoading || !data) {
    return <p className="mt-6 text-fpl-gray-500">Loading…</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border border-fpl-gray-200 p-6">
        <p className="text-sm text-fpl-gray-500">Total commission collected</p>
        <p className="text-3xl font-bold text-fpl-purple">
          {(data.commissionTotalMinor / 100).toFixed(2)} ETB
        </p>
      </div>
      <div className="rounded-lg border border-fpl-gray-200 p-4">
        <p className="text-sm font-medium">Reconciliation</p>
        <p className="text-sm text-fpl-gray-600">
          {data.reconciliation.mismatches.length} mismatch(es) of {data.reconciliation.total} wallets
        </p>
        <Button
          className="mt-2"
          variant="secondary"
          onClick={() => runReconciliation.mutate()}
          isLoading={runReconciliation.isPending}
        >
          Run reconciliation now
        </Button>
      </div>
    </div>
  );
}
