import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinLeague } from '@/api/leagues.api';
import { queryKeys } from '@/lib/queryKeys';
import type { JoinLeagueInput } from '@/types/league';

export function useJoinLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: JoinLeagueInput) => joinLeague(input),
    onSuccess: (league) => {
      void queryClient.invalidateQueries({ queryKey: ['leagues'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leagueStandings(league.id) });
    },
  });
}
