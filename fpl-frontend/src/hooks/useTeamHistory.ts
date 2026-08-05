import { useQuery } from '@tanstack/react-query';
import { getTeamHistory } from '@/api/teams.api';

export function useTeamHistory(teamId: string | undefined, season?: string) {
  return useQuery({
    queryKey: ['teamHistory', teamId, season],
    queryFn: () => getTeamHistory(teamId!, season),
    enabled: Boolean(teamId),
    staleTime: 60_000,
  });
}
