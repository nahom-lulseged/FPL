import { apiClient } from '@/api/client';
import type {
  AdminFixturesResponse,
  AdminGameweeksResponse,
  AdminPlayersResponse,
  AdminRealTeam,
  AdminRealTeamsResponse,
  AdminPlayer,
  AdminPlayerDetail,
  AdminFixture,
  AdminGameweek,
  UpdateFixtureBody,
  UpdateGameweekBody,
  UpdatePlayerBody,
  UpdateRealTeamBody,
} from '@/types/content';

export async function listAdminPlayers(params: {
  page?: number;
  limit?: number;
  search?: string;
  position?: string;
  teamId?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<AdminPlayersResponse> {
  const { data } = await apiClient.get<AdminPlayersResponse>('/api/admin/content/players', {
    params,
  });
  return data;
}

export async function getAdminPlayer(id: string): Promise<AdminPlayerDetail> {
  const { data } = await apiClient.get<AdminPlayerDetail>(`/api/admin/content/players/${id}`);
  return data;
}

export async function syncAdminPlayerSummary(
  id: string,
): Promise<{ result: { created: number; updated: number; skipped: number }; player: AdminPlayerDetail }> {
  const { data } = await apiClient.post<{
    result: { created: number; updated: number; skipped: number };
    player: AdminPlayerDetail;
  }>(`/api/admin/content/players/${id}/sync-summary`);
  return data;
}

export async function updateAdminPlayer(
  id: string,
  body: UpdatePlayerBody,
): Promise<AdminPlayer> {
  const { data } = await apiClient.patch<AdminPlayer>(`/api/admin/content/players/${id}`, body);
  return data;
}

export async function listAdminRealTeams(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminRealTeamsResponse> {
  const { data } = await apiClient.get<AdminRealTeamsResponse>('/api/admin/content/real-teams', {
    params,
  });
  return data;
}

export async function getAdminRealTeam(id: string): Promise<AdminRealTeam> {
  const { data } = await apiClient.get<AdminRealTeam>(`/api/admin/content/real-teams/${id}`);
  return data;
}

export async function updateAdminRealTeam(
  id: string,
  body: UpdateRealTeamBody,
): Promise<AdminRealTeam> {
  const { data } = await apiClient.patch<AdminRealTeam>(
    `/api/admin/content/real-teams/${id}`,
    body,
  );
  return data;
}

export async function listAdminFixtures(params: {
  page?: number;
  limit?: number;
  gameweek?: number;
  teamId?: string;
  isPostponed?: boolean;
}): Promise<AdminFixturesResponse> {
  const query: Record<string, string | number | boolean> = {};
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.gameweek !== undefined) query.gameweek = params.gameweek;
  if (params.teamId) query.teamId = params.teamId;
  if (params.isPostponed !== undefined) query.isPostponed = String(params.isPostponed);

  const { data } = await apiClient.get<AdminFixturesResponse>('/api/admin/content/fixtures', {
    params: query,
  });
  return data;
}

export async function updateAdminFixture(
  id: string,
  body: UpdateFixtureBody,
): Promise<AdminFixture> {
  const { data } = await apiClient.patch<AdminFixture>(
    `/api/admin/content/fixtures/${id}`,
    body,
  );
  return data;
}

export async function listAdminGameweeks(params: {
  page?: number;
  limit?: number;
}): Promise<AdminGameweeksResponse> {
  const { data } = await apiClient.get<AdminGameweeksResponse>('/api/admin/content/gameweeks', {
    params,
  });
  return data;
}

export async function updateAdminGameweek(
  id: string,
  body: UpdateGameweekBody,
): Promise<AdminGameweek> {
  const { data } = await apiClient.patch<AdminGameweek>(
    `/api/admin/content/gameweeks/${id}`,
    body,
  );
  return data;
}
