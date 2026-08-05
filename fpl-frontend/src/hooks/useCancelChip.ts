import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelChip } from '@/api/chips.api';

export function useCancelChip(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chipType: 'bench-boost' | 'triple-captain') => cancelChip(teamId, chipType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      void queryClient.invalidateQueries({ queryKey: ['chipStatus', teamId] });
    },
  });
}
