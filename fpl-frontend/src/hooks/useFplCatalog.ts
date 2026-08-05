import { useQuery } from '@tanstack/react-query';
import { getFplFixtures, getFplOverview, getFplPlayers } from '@/api/fplCatalog.api';

export function useFplOverview() {
  return useQuery({
    queryKey: ['fpl-catalog', 'overview'],
    queryFn: getFplOverview,
    staleTime: 5 * 60_000,
  });
}

export function useFplPlayers(params: Parameters<typeof getFplPlayers>[0] = {}) {
  return useQuery({
    queryKey: ['fpl-catalog', 'players', params],
    queryFn: () => getFplPlayers(params),
    staleTime: 5 * 60_000,
  });
}

export function useFplFixtures(params: Parameters<typeof getFplFixtures>[0] = {}) {
  return useQuery({
    queryKey: ['fpl-catalog', 'fixtures', params],
    queryFn: () => getFplFixtures(params),
    staleTime: 2 * 60_000,
  });
}

