import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listFixtures } from '@/api/fixtures.api';
import type { ListFixturesParams } from '@/types/fixture';

export function useFixtures(params: ListFixturesParams) {
  return useQuery({
    queryKey: ['fixtures', params],
    queryFn: () => listFixtures(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
