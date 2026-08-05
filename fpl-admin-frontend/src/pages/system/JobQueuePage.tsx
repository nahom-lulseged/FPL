import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { useCreateQueuesSession, useSystemHealth } from '@/hooks/useSystem';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function JobQueuePage() {
  const { mutateAsync: createSession, isPending, isSuccess, isError } = useCreateQueuesSession();
  const { data: health } = useSystemHealth();
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    void createSession().then(() => setIframeReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bullMqEnabled = (health?.queues.length ?? 0) > 0;

  function openBullBoard() {
    window.open(`${API_BASE}/admin/queues`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-fpl-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-fpl-gray-900">Bull Board</h2>
        <p className="mt-1 text-sm text-fpl-gray-500">
          View failed jobs, retries, and queue depth via the built-in Bull Board UI.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={openBullBoard} disabled={isPending || !isSuccess}>
            Open Bull Board
          </Button>
        </div>

        {isError ? (
          <p className="mt-2 text-sm text-fpl-pink">Failed to establish queue session.</p>
        ) : null}

        {!bullMqEnabled && health ? (
          <p className="mt-2 text-sm text-amber-600">
            BullMQ appears disabled on the server. The board may return a 503 error.
          </p>
        ) : null}
      </div>

      {iframeReady && isSuccess ? (
        <div className="overflow-hidden rounded-lg border border-fpl-gray-200 bg-white">
          <iframe
            title="Bull Board"
            src={`${API_BASE}/admin/queues`}
            className="h-[70vh] w-full"
          />
        </div>
      ) : null}
    </div>
  );
}
