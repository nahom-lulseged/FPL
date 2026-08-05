import { useQuery } from '@tanstack/react-query';
import { getMyTeamOrNull, getTeam } from '@/api/teams.api';
import { CURRENT_SEASON } from '@/lib/config';
import { useLiveTeamScores } from '@/hooks/useLiveTeamScores';
import { useLiveGameweek } from '@/hooks/useLiveGameweek';

export function useMyTeam(season: string = CURRENT_SEASON, gameweek?: number) {
  const refQuery = useQuery({
    queryKey: ['myTeamRef', season],
    queryFn: () => getMyTeamOrNull(season),
    staleTime: 30_000,
  });

  const teamQuery = useQuery({
    queryKey: ['team', refQuery.data?.teamId, gameweek],
    queryFn: () => getTeam(refQuery.data!.teamId, gameweek),
    enabled: Boolean(refQuery.data?.teamId),
    staleTime: 30_000,
  });

  const isLiveGameweek = teamQuery.data?.gameweek?.status === 'LIVE';
  useLiveTeamScores(refQuery.data?.teamId, gameweek, isLiveGameweek);
  useLiveGameweek(gameweek, isLiveGameweek, refQuery.data?.teamId);

  return {
    teamRef: refQuery.data ?? undefined,
    team: teamQuery.data,
    isLoading: refQuery.isLoading || (Boolean(refQuery.data) && teamQuery.isLoading),
    isError: refQuery.isError || teamQuery.isError,
    error: refQuery.error ?? teamQuery.error,
    hasNoTeam: refQuery.isSuccess && refQuery.data === null,
    refetch: async () => {
      await refQuery.refetch();
      await teamQuery.refetch();
    },
  };
}
