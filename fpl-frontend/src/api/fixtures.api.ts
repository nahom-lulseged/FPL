import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@/types/api';
import type { FixtureListItem, ListFixturesParams } from '@/types/fixture';

export async function listFixtures(
  params: ListFixturesParams = {},
): Promise<PaginatedResponse<FixtureListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<FixtureListItem>>('/api/fixtures', {
    params,
  });
  return data;
}
