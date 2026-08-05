import { useMutation, useQueryClient } from '@tanstack/react-query';
import { playChip } from '@/api/chips.api';
import type { ChipTypeParam, PlayWildcardInput } from '@/types/chip';

interface PlayChipVariables {
  chipType: ChipTypeParam;
  body?: PlayWildcardInput;
}

export function usePlayChip(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chipType, body }: PlayChipVariables) => playChip(teamId, chipType, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chipStatus', teamId] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['myTeamRef'] });
    },
  });
}
