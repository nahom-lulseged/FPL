import clsx from 'clsx';
import { KpiCard } from '@/components/metrics/KpiCard';
import { useSystemHealth } from '@/hooks/useSystem';

const statusColors: Record<string, string> = {
  ok: 'bg-fpl-green/10 text-fpl-green',
  degraded: 'bg-amber-100 text-amber-700',
  down: 'bg-fpl-pink/10 text-fpl-pink',
};

export function SystemHealthPage() {
  const { data, isLoading, error } = useSystemHealth();

  if (isLoading) {
    return <p className="text-sm text-fpl-gray-500">Loading health metrics…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-fpl-pink">Failed to load system health.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Overall Status"
          value={data.status.toUpperCase()}
          children={
            <span
              className={clsx(
                'inline-block rounded px-2 py-0.5 text-xs font-medium',
                statusColors[data.status],
              )}
            >
              {data.status}
            </span>
          }
        />
        <KpiCard
          label="Database Latency"
          value={`${data.db.latencyMs} ms`}
          children={
            <span className={clsx('text-xs', data.db.ok ? 'text-fpl-green' : 'text-fpl-pink')}>
              {data.db.ok ? 'Connected' : 'Down'}
            </span>
          }
        />
        <KpiCard
          label="Redis Latency"
          value={`${data.redis.latencyMs} ms`}
          children={
            <span className={clsx('text-xs', data.redis.ok ? 'text-fpl-green' : 'text-fpl-pink')}>
              {data.redis.ok ? 'Connected' : 'Down'}
            </span>
          }
        />
        <KpiCard label="Heap Memory" value={`${data.memory.heapUsedMb} MB`} />
      </div>

      <div className="rounded-lg border border-fpl-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-fpl-gray-900">Runtime</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-fpl-gray-500">RSS</dt>
            <dd className="font-medium">{data.memory.rssMb} MB</dd>
          </div>
          <div>
            <dt className="text-fpl-gray-500">Heap Total</dt>
            <dd className="font-medium">{data.memory.heapTotalMb} MB</dd>
          </div>
          <div>
            <dt className="text-fpl-gray-500">Uptime</dt>
            <dd className="font-medium">{data.uptimeSeconds}s</dd>
          </div>
        </dl>
      </div>

      {data.queues.length > 0 ? (
        <div className="rounded-lg border border-fpl-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-fpl-gray-900">Queue Depths</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-fpl-gray-200 text-fpl-gray-500">
                  <th className="py-2 pr-4 font-medium">Queue</th>
                  <th className="py-2 pr-4 font-medium">Active</th>
                  <th className="py-2 pr-4 font-medium">Waiting</th>
                  <th className="py-2 pr-4 font-medium">Failed</th>
                  <th className="py-2 font-medium">Delayed</th>
                </tr>
              </thead>
              <tbody>
                {data.queues.map((queue) => (
                  <tr key={queue.name} className="border-b border-fpl-gray-100">
                    <td className="py-2 pr-4 font-medium">{queue.name}</td>
                    <td className="py-2 pr-4">{queue.active}</td>
                    <td className="py-2 pr-4">{queue.waiting}</td>
                    <td
                      className={clsx(
                        'py-2 pr-4',
                        queue.failed > 0 ? 'font-medium text-fpl-pink' : '',
                      )}
                    >
                      {queue.failed}
                    </td>
                    <td className="py-2">{queue.delayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-fpl-gray-500">BullMQ is disabled — no queue metrics available.</p>
      )}
    </div>
  );
}
