import { apiClient } from '@/api/client';
import type {
  AdminLeagueDetail,
  AdminLeagueListParams,
  AdminLeaguesListResponse,
  DissolveLeagueResponse,
  RemoveLeagueMemberResponse,
} from '@/types/league';

export async function listAdminLeagues(
  params: AdminLeagueListParams = {},
): Promise<AdminLeaguesListResponse> {
  const { data } = await apiClient.get<AdminLeaguesListResponse>('/api/admin/leagues', {
    params,
  });
  return data;
}

export async function getAdminLeague(id: string): Promise<AdminLeagueDetail> {
  const { data } = await apiClient.get<AdminLeagueDetail>(`/api/admin/leagues/${id}`);
  return data;
}

export async function removeLeagueMember(
  leagueId: string,
  userId: string,
): Promise<RemoveLeagueMemberResponse> {
  const { data } = await apiClient.delete<RemoveLeagueMemberResponse>(
    `/api/admin/leagues/${leagueId}/members/${userId}`,
    { data: { confirm: true } },
  );
  return data;
}

export async function dissolveLeague(leagueId: string): Promise<DissolveLeagueResponse> {
  const { data } = await apiClient.delete<DissolveLeagueResponse>(
    `/api/admin/leagues/${leagueId}`,
    { data: { confirm: true } },
  );
  return data;
}
