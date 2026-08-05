import { Link, useParams } from 'react-router-dom';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { usePlayer } from '@/hooks/usePlayer';
import { formatKickoff, formatPrice } from '@/lib/formatters';

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: player, isLoading, isError, error, refetch } = usePlayer(id);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isError || !player) {
    return (
      <QueryErrorState
        error={error ?? { error: 'Player not found' }}
        onRetry={() => void refetch()}
      />
    );
  }

  const stats = [
    { label: 'Total points', value: player.totalPoints },
    { label: 'GW points', value: player.eventPoints },
    { label: 'Selected by', value: `${player.selectedByPercent.toFixed(1)}%` },
    { label: 'Minutes', value: player.minutes },
    { label: 'Goals', value: player.goalsScored },
    { label: 'Assists', value: player.assists },
    { label: 'Clean sheets', value: player.cleanSheets },
  ];

  const history = player.history ?? [];
  const historyPast = player.historyPast ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/fixtures" className="text-sm text-fpl-cyan hover:underline">
          Back to fixtures
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{player.name}</h1>
        <p className="mt-1 text-sm text-white/60">
          {player.position} · {player.realTeam.name} · {formatPrice(player.price)}
          {!player.isAvailable ? ' · Unavailable' : ''}
        </p>
        {player.injuryNote ? (
          <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {player.injuryNote}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <p className="text-xs uppercase tracking-wide text-white/50">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Gameweek history</h2>
        <div data-lenis-prevent className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-white/60">No gameweek history yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-3 py-2">GW</th>
                  <th className="px-3 py-2">Opp</th>
                  <th className="px-3 py-2">Pts</th>
                  <th className="px-3 py-2">Mins</th>
                  <th className="px-3 py-2">G</th>
                  <th className="px-3 py-2">A</th>
                  <th className="px-3 py-2">CS</th>
                  <th className="px-3 py-2">Bonus</th>
                  <th className="px-3 py-2">£</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((row) => (
                  <tr key={row.gameweek} className="border-b border-white/5 last:border-b-0">
                    <td className="px-3 py-2 text-white">{row.gameweek}</td>
                    <td className="px-3 py-2 text-white/80">
                      {row.opponent
                        ? `${row.wasHome ? 'H' : 'A'} ${row.opponent.shortName}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold text-white">{row.points}</td>
                    <td className="px-3 py-2 text-white/80">{row.minutes}</td>
                    <td className="px-3 py-2 text-white/80">{row.goals}</td>
                    <td className="px-3 py-2 text-white/80">{row.assists}</td>
                    <td className="px-3 py-2 text-white/80">{row.cleanSheet ? 1 : 0}</td>
                    <td className="px-3 py-2 text-white/80">{row.bonus}</td>
                    <td className="px-3 py-2 text-white/80">
                      {row.value != null ? formatPrice(row.value) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Past seasons</h2>
        <div data-lenis-prevent className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          {historyPast.length === 0 ? (
            <p className="px-4 py-6 text-center text-white/60">No prior season history.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-3 py-2">Season</th>
                  <th className="px-3 py-2">Pts</th>
                  <th className="px-3 py-2">Mins</th>
                  <th className="px-3 py-2">G</th>
                  <th className="px-3 py-2">A</th>
                  <th className="px-3 py-2">CS</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                </tr>
              </thead>
              <tbody>
                {historyPast.map((row) => (
                  <tr key={row.seasonName} className="border-b border-white/5 last:border-b-0">
                    <td className="px-3 py-2 text-white">{row.seasonName}</td>
                    <td className="px-3 py-2 font-semibold text-white">{row.totalPoints}</td>
                    <td className="px-3 py-2 text-white/80">{row.minutes}</td>
                    <td className="px-3 py-2 text-white/80">{row.goalsScored}</td>
                    <td className="px-3 py-2 text-white/80">{row.assists}</td>
                    <td className="px-3 py-2 text-white/80">{row.cleanSheets}</td>
                    <td className="px-3 py-2 text-white/80">{formatPrice(row.startCost)}</td>
                    <td className="px-3 py-2 text-white/80">{formatPrice(row.endCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Upcoming fixtures</h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {player.upcomingFixtures.length === 0 ? (
            <p className="px-4 py-6 text-center text-white/60">No upcoming fixtures scheduled.</p>
          ) : (
            player.upcomingFixtures.map((fixture) => (
              <div
                key={fixture.id}
                className="flex items-center justify-between border-b border-white/10 px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="font-medium text-white">
                    GW {fixture.gameweek.number} · {fixture.isHome ? 'H' : 'A'} vs{' '}
                    {fixture.opponent.shortName}
                  </p>
                  <p className="text-xs text-white/50">{formatKickoff(fixture.kickoffTime)}</p>
                </div>
                <span className="rounded bg-white/10 px-2 py-1 text-sm font-semibold text-white">
                  FDR {fixture.fdr ?? '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
