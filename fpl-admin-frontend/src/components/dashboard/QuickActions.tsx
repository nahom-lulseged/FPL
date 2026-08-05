import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { triggerManualSync } from '@/api/ingestion.api';
import { Button } from '@/components/common/Button';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';

const linkButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-md border border-fpl-gray-200 bg-white px-4 py-2 text-sm font-semibold text-fpl-gray-900 transition hover:bg-fpl-gray-50';

export function QuickActions() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const syncMutation = useMutation({
    mutationFn: triggerManualSync,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }),
      ]);
      toast.success(
        `Sync All completed: ${data.result.created} created, ${data.result.updated} updated, ${data.result.skipped} skipped.`,
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Sync All failed. Try again from Ingestion controls.'));
    },
  });

  return (
    <div className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-fpl-gray-900">Quick Actions</h2>
      <div className="mt-3 flex flex-col gap-2">
        <Button
          variant="primary"
          isLoading={syncMutation.isPending}
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          Sync All
        </Button>
        <Link to="/system/queues" className={clsx(linkButtonClass, 'text-center')}>
          View Job Queue
        </Link>
        <Link to="/users" className={clsx(linkButtonClass, 'text-center')}>
          Search Users
        </Link>
      </div>
    </div>
  );
}
