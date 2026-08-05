import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { IngestionSubNav } from '@/components/ingestion/IngestionSubNav';
import { useIngestionStatus } from '@/hooks/useIngestionStatus';
import { useElementSummaryBackfill, useTriggerSync } from '@/hooks/useTriggerSync';
import { formatDate, formatRelativeTime } from '@/lib/formatters';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type { SyncTriggerType } from '@/types/ingestionStatus';

const syncButtons: { type: SyncTriggerType; label: string; variant?: 'primary' | 'secondary' }[] = [
  { type: 'teams', label: 'Sync Teams' },
  { type: 'players', label: 'Sync Players' },
  { type: 'fixtures', label: 'Sync Fixtures' },
  { type: 'gameweeks', label: 'Sync Gameweeks' },
  { type: 'all', label: 'Sync All', variant: 'primary' },
];

export function IngestionControlPage() {
  const { data: status } = useIngestionStatus();
  const syncMutation = useTriggerSync();
  const backfillMutation = useElementSummaryBackfill();
  const toast = useToast();

  const handleSync = (type: SyncTriggerType) => {
    syncMutation.mutate(type, {
      onSuccess: (result) => {
        const { created, updated, skipped } = result.result;
        toast.success(
          `${type} sync complete — ${created} created, ${updated} updated, ${skipped} skipped`,
        );
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Sync failed'));
      },
    });
  };

  const handleBackfill = () => {
    backfillMutation.mutate(
      {},
      {
        onSuccess: (result) => {
          if (result.queued) {
            toast.success(`Element summary backfill queued (${result.jobId ?? 'job'})`);
            return;
          }
          const stats = result.result;
          toast.success(
            stats
              ? `Backfill complete — ${stats.created} created, ${stats.updated} updated`
              : 'Element summary backfill complete',
          );
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Backfill failed'));
        },
      },
    );
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-fpl-gray-900">Ingestion Control</h1>
      <p className="mt-1 text-sm text-fpl-gray-500">Manually trigger data syncs from the FPL API</p>

      <IngestionSubNav />

      <div className="mb-6 rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-fpl-gray-900">Last Sync Status</h2>
        {status?.lastSyncAt ? (
          <dl className="mt-2 grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-fpl-gray-500">When:</dt>
              <dd className="text-fpl-gray-900">
                {formatRelativeTime(status.lastSyncAt)} ({formatDate(status.lastSyncAt)})
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-fpl-gray-500">Result:</dt>
              <dd className={status.success ? 'text-fpl-green' : 'text-fpl-pink'}>
                {status.success ? 'Success' : 'Failed'}
              </dd>
            </div>
            {status.error ? (
              <div className="flex gap-2">
                <dt className="text-fpl-gray-500">Error:</dt>
                <dd className="text-fpl-pink">{status.error}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-fpl-gray-500">No sync recorded yet.</p>
        )}
        <Link
          to="/ingestion/history"
          className="mt-3 inline-block text-sm font-medium text-fpl-purple hover:underline"
        >
          View sync history →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {syncButtons.map((btn) => (
          <Button
            key={btn.type}
            variant={btn.variant ?? 'secondary'}
            fullWidth
            isLoading={syncMutation.isPending && syncMutation.variables === btn.type}
            disabled={syncMutation.isPending || backfillMutation.isPending}
            onClick={() => handleSync(btn.type)}
          >
            {btn.label}
          </Button>
        ))}
        <Button
          variant="secondary"
          fullWidth
          isLoading={backfillMutation.isPending}
          disabled={syncMutation.isPending || backfillMutation.isPending}
          onClick={handleBackfill}
        >
          Backfill element summaries
        </Button>
      </div>
    </div>
  );
}
