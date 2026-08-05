import { useQuery } from '@tanstack/react-query';
import { getTeamGameweekBreakdown } from '@/api/teams.api';
import { useSocket } from '@/hooks/useSocket';
import type { GameweekStatus } from '@/types/gameweek';

export function useTeamGameweekBreakdown(
  teamId: string | undefined,
  gameweek: number | undefined,
  enabled: boolean,
  gameweekStatus?: GameweekStatus,
) {
  const { isConnected } = useSocket();
  const isLive = gameweekStatus === 'LIVE';

  return useQuery({
    queryKey: ['teamGwBreakdown', teamId, gameweek],
    queryFn: () => getTeamGameweekBreakdown(teamId!, gameweek!),
    enabled: Boolean(teamId && gameweek && enabled),
    staleTime: isLive ? 15_000 : 30_000,
    refetchInterval: isLive && !isConnected ? 30_000 : false,
  });
}
