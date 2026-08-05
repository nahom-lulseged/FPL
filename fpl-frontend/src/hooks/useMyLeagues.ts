import { useQuery } from '@tanstack/react-query';
import { listMyLeagues } from '@/api/leagues.api';
import { CURRENT_SEASON } from '@/lib/config';

export function useMyLeagues(season: string = CURRENT_SEASON) {
  return useQuery({
    queryKey: ['leagues', season],
    queryFn: () => listMyLeagues(season),
    staleTime: 30_000,
  });
}
