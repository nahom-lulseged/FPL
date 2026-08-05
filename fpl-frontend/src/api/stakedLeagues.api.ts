import { apiClient } from '@/api/client';
import type { LeagueSummary } from '@/types/league';
import type { PaginatedResponse } from '@/types/api';

export async function listPublicStakedLeagues(params?: {
  page?: number;
  limit?: number;
  season?: string;
}): Promise<PaginatedResponse<LeagueSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<LeagueSummary>>('/api/staked-leagues', {
    params,
  });
  return data;
}

export async function joinPublicStakedLeague(leagueId: string): Promise<LeagueSummary> {
  const { data } = await apiClient.post<LeagueSummary>(`/api/staked-leagues/${leagueId}/join`);
  return data;
}
