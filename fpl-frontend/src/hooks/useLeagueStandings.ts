import { useQuery } from '@tanstack/react-query';
import { getLeagueStandings } from '@/api/leagues.api';
import { queryKeys } from '@/lib/queryKeys';

export function useLeagueStandings(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leagueStandings(id),
    queryFn: () => getLeagueStandings(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
