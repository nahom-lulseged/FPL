import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeague } from '@/api/leagues.api';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateLeagueInput } from '@/types/league';

export function useCreateLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLeagueInput) => createLeague(input),
    onSuccess: (league) => {
      void queryClient.invalidateQueries({ queryKey: ['leagues'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leagueStandings(league.id) });
    },
  });
}
