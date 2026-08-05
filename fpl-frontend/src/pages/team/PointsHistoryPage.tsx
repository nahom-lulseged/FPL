import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { TransferHistoryList } from '@/components/transfers/TransferHistoryList';
import { useMyTeam } from '@/hooks/useMyTeam';
import { useTeamHistory } from '@/hooks/useTeamHistory';
import { useTransferHistory } from '@/hooks/useTransferHistory';
import { useGameweekStore } from '@/store/gameweekStore';

export function PointsHistoryPage() {
  const [activeTab, setActiveTab] = useState<'points' | 'transfers'>('points');
  const [transferPage, setTransferPage] = useState(1);
  const setSelectedGameweekNumber = useGameweekStore((s) => s.setSelectedGameweekNumber);
  const { team, isLoading: teamLoading, isError: teamError, error: teamErr, hasNoTeam, refetch } =
    useMyTeam();
  const {
    data,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErr,
    refetch: refetchHistory,
  } = useTeamHistory(team?.id);
  const transferHistoryQuery = useTransferHistory(team?.id ?? '', {
    page: transferPage,
    limit: 10,
  });

  if (teamError) {
    return (
      <QueryErrorState
        error={teamErr}
        message="Failed to load your team"
        onRetry={() => void refetch()}
      />
    );
  }

  if (teamLoading || (team && historyLoading)) {
    return <FullPageSpinner />;
  }

  if (hasNoTeam || !team) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-white">Points history</h1>
        <p className="text-white/70">Create a team first to see your season history.</p>
        <Link to="/my-team" className="text-fpl-cyan hover:underline">
          Go to My Team
        </Link>
      </div>
    );
  }

  if (historyError) {
    return (
      <QueryErrorState
        error={historyErr}
        message="Failed to load points history"
        onRetry={() => void refetchHistory()}
      />
    );
  }

  const rows = data?.history ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/my-team" className="text-sm text-fpl-cyan hover:underline">
            Back to My Team
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Points history</h1>
          <p className="mt-1 text-sm text-white/60">
            {data?.name} · {data?.season} · {data?.totalPoints ?? team.totalPoints} total pts
          </p>
        </div>
      </div>

      <div className="fpl-panel-tabs" role="tablist" aria-label="History type">
        <button type="button" className={activeTab === 'points' ? 'is-active' : undefined} onClick={() => setActiveTab('points')}>
          Points
        </button>
        <button type="button" className={activeTab === 'transfers' ? 'is-active' : undefined} onClick={() => setActiveTab('transfers')}>
          Transfers
        </button>
      </div>

      {activeTab === 'transfers' ? (
        <section className="fpl-surface-panel space-y-3">
          <h2 className="text-lg font-bold text-white">Transfer history</h2>
          <TransferHistoryList
            data={transferHistoryQuery.data}
            isLoading={transferHistoryQuery.isLoading}
            page={transferPage}
            onPageChange={setTransferPage}
          />
        </section>
      ) : (
      <div data-lenis-prevent className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-white/60">No gameweek history yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-3 py-2">GW</th>
                <th className="px-3 py-2">Pts</th>
                <th className="px-3 py-2">Hit</th>
                <th className="px-3 py-2">Transfers</th>
                <th className="px-3 py-2">Chip</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row) => (
                <tr key={row.gameweek} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-2">
                    <Link
                      to="/my-team"
                      className="font-medium text-fpl-cyan hover:underline"
                      onClick={() => setSelectedGameweekNumber(row.gameweek)}
                    >
                      GW {row.gameweek}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-semibold text-white">
                    {row.points ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-white/80">
                    {row.transferHit != null && row.transferHit !== 0
                      ? `-${row.transferHit}`
                      : '0'}
                  </td>
                  <td className="px-3 py-2 text-white/80">{row.transfersMade}</td>
                  <td className="px-3 py-2 text-white/80">{row.chip ?? '—'}</td>
                  <td className="px-3 py-2 text-white">{row.totalPointsCumulative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
}
