import { Link } from 'react-router-dom';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { usePlayers } from '@/hooks/usePlayers';
import { formatPrice } from '@/lib/formatters';
import type { PlayerListItem, Position } from '@/types/player';

const DREAM_TEAM_SHAPE: Record<Position, number> = {
  GK: 1,
  DEF: 4,
  MID: 4,
  FWD: 2,
};

function pickDreamTeam(players: PlayerListItem[]): PlayerListItem[] {
  const byPosition: Record<Position, PlayerListItem[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (const player of players) {
    byPosition[player.position].push(player);
  }

  for (const position of Object.keys(byPosition) as Position[]) {
    byPosition[position].sort((a, b) => b.eventPoints - a.eventPoints);
  }

  const selected: PlayerListItem[] = [];
  for (const [position, count] of Object.entries(DREAM_TEAM_SHAPE) as [Position, number][]) {
    selected.push(...byPosition[position].slice(0, count));
  }

  return selected;
}

export function DreamTeamPage() {
  const { data, isLoading, isError, error, refetch } = usePlayers({
    sortBy: 'eventPoints',
    sortDir: 'desc',
    limit: 100,
  });

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => void refetch()} />;
  }

  const dreamTeam = pickDreamTeam(data?.data ?? []);
  const totalPoints = dreamTeam.reduce((sum, player) => sum + player.eventPoints, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dream Team</h1>
          <p className="mt-1 text-sm text-white/60">
            Top performers this gameweek by position ({totalPoints} pts combined).
          </p>
        </div>
        <Link to="/fixtures" className="text-sm font-medium text-fpl-cyan hover:underline">
          View fixtures
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium text-right">GW pts</th>
            </tr>
          </thead>
          <tbody>
            {dreamTeam.map((player) => (
              <tr key={player.id} className="border-b border-white/10 last:border-b-0">
                <td className="px-4 py-3">
                  <Link to={`/players/${player.id}`} className="font-medium text-white hover:text-fpl-cyan">
                    {player.name}
                  </Link>
                  <span className="ml-2 text-xs text-white/50">{player.position}</span>
                </td>
                <td className="px-4 py-3 text-white/80">{player.realTeam.shortName}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  {player.eventPoints}
                  <span className="ml-2 text-xs font-normal text-white/50">
                    {formatPrice(player.price)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
