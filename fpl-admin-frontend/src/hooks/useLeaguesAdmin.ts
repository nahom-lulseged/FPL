import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dissolveLeague,
  getAdminLeague,
  listAdminLeagues,
  removeLeagueMember,
} from '@/api/leagues.api';
import type { AdminLeagueListParams } from '@/types/league';

export function useLeaguesList(params: AdminLeagueListParams) {
  return useQuery({
    queryKey: ['admin', 'leagues', params],
    queryFn: () => listAdminLeagues(params),
    placeholderData: keepPreviousData,
  });
}

export function useLeagueDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'leagues', id],
    queryFn: () => getAdminLeague(id!),
    enabled: Boolean(id),
  });
}

export function useRemoveLeagueMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leagueId, userId }: { leagueId: string; userId: string }) =>
      removeLeagueMember(leagueId, userId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'leagues'] });
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'leagues', variables.leagueId],
      });
    },
  });
}

export function useDissolveLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueId: string) => dissolveLeague(leagueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'leagues'] });
    },
  });
}
