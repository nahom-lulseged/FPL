import { useQuery } from '@tanstack/react-query';
import { getChipStatus } from '@/api/chips.api';

export function useChipStatus(teamId: string | undefined) {
  return useQuery({
    queryKey: ['chipStatus', teamId],
    queryFn: () => getChipStatus(teamId!),
    enabled: Boolean(teamId),
    staleTime: 30_000,
  });
}
