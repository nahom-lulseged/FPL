import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@/types/api';
import type {
  FplCatalogFixture,
  FplCatalogOverview,
  FplCatalogPlayer,
  FplCatalogTeam,
} from '@/types/fplCatalog';

export async function getFplOverview(): Promise<FplCatalogOverview> {
  const { data } = await apiClient.get<FplCatalogOverview>('/api/fpl/overview');
  return data;
}

export async function getFplTeams(): Promise<{ data: FplCatalogTeam[] }> {
  const { data } = await apiClient.get<{ data: FplCatalogTeam[] }>('/api/fpl/teams');
  return data;
}

export async function getFplPlayers(params: {
  team?: number;
  position?: number;
  search?: string;
  sortBy?: 'total_points' | 'event_points' | 'form' | 'selected_by_percent' | 'now_cost';
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedResponse<FplCatalogPlayer>> {
  const { data } = await apiClient.get<PaginatedResponse<FplCatalogPlayer>>('/api/fpl/players', {
    params,
  });
  return data;
}

export async function getFplFixtures(params: { gameweek?: number; team?: number } = {}) {
  const { data } = await apiClient.get<{ data: FplCatalogFixture[]; total: number }>(
    '/api/fpl/fixtures',
    { params },
  );
  return data;
}
