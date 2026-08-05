import { useQuery } from '@tanstack/react-query';
import { listRealTeams } from '@/api/players.api';

export function useRealTeams() {
  return useQuery({
    queryKey: ['realTeams'],
    queryFn: listRealTeams,
    staleTime: 5 * 60_000,
    select: (result) => result.data,
  });
}
