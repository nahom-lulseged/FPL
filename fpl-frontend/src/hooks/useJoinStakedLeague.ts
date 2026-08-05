import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinPublicStakedLeague } from '@/api/stakedLeagues.api';
import { getErrorMessage } from '@/types/api';

export function useJoinStakedLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinPublicStakedLeague,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leagues'] });
      void queryClient.invalidateQueries({ queryKey: ['staked-leagues'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    meta: { getErrorMessage },
  });
}
