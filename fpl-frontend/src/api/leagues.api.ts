import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@/types/api';
import type {
  CreateLeagueInput,
  JoinLeagueInput,
  ClassicStandingRow,
  LeagueSummary,
} from '@/types/league';

export type LeagueListResponse = PaginatedResponse<LeagueSummary>;

export interface LeagueStandingsResponse {
  leagueId: string;
  type: 'CLASSIC';
  currentGameweek: number | null;
  data: ClassicStandingRow[];
  meta: PaginatedResponse<ClassicStandingRow>['meta'];
}

export async function listMyLeagues(season?: string): Promise<LeagueListResponse> {
  const { data } = await apiClient.get<LeagueListResponse>('/api/leagues', {
    params: season ? { season } : undefined,
  });
  return data;
}

export async function createLeague(input: CreateLeagueInput): Promise<LeagueSummary> {
  const { data } = await apiClient.post<LeagueSummary>('/api/leagues', input);
  return data;
}

export async function joinLeague(input: JoinLeagueInput): Promise<LeagueSummary> {
  const { data } = await apiClient.post<LeagueSummary>('/api/leagues/join', input);
  return data;
}

export async function getLeague(id: string): Promise<LeagueSummary> {
  const { data } = await apiClient.get<LeagueSummary>(`/api/leagues/${id}`);
  return data;
}

export async function getLeagueStandings(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<LeagueStandingsResponse> {
  const { data } = await apiClient.get<LeagueStandingsResponse>(`/api/leagues/${id}/standings`, {
    params: { limit: 100, ...params },
  });
  return data;
}
