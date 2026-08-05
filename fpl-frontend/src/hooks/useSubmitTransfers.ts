import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitTransfers } from '@/api/transfers.api';
import type { TeamDetail } from '@/types/team';
import type { SubmitTransfersInput } from '@/types/transfer';

export function useSubmitTransfers(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitTransfersInput) => submitTransfers(teamId, input),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['team', teamId] });
      const previousEntries = queryClient.getQueriesData<TeamDetail>({ queryKey: ['team', teamId] });
      return { previousEntries };
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ['team', teamId] }, data);
      void queryClient.invalidateQueries({ queryKey: ['myTeamRef'] });
      void queryClient.invalidateQueries({ queryKey: ['transferHistory', teamId] });
      void queryClient.invalidateQueries({ queryKey: ['leagueStandings'] });
    },
    onError: (_error, _transfers, context) => {
      context?.previousEntries.forEach(([queryKey, previousData]) => {
        if (previousData !== undefined) {
          queryClient.setQueryData(queryKey, previousData);
        }
      });
    },
  });
}
