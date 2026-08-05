import { useQuery } from '@tanstack/react-query';
import { listPublicStakedLeagues } from '@/api/stakedLeagues.api';
import { CURRENT_SEASON } from '@/lib/config';

export function useStakedLeagues(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['staked-leagues', CURRENT_SEASON, page, limit],
    queryFn: () => listPublicStakedLeagues({ page, limit, season: CURRENT_SEASON }),
    staleTime: 30_000,
  });
}
