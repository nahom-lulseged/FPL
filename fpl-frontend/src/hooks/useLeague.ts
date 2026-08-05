import { useQuery } from '@tanstack/react-query';
import { getLeague } from '@/api/leagues.api';

export function useLeague(id: string | undefined) {
  return useQuery({
    queryKey: ['league', id],
    queryFn: () => getLeague(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
