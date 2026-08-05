import { apiClient } from '@/api/client';
import type {
  CreateTeamInput,
  MyTeamRef,
  SetCaptainInput,
  SetLineupInput,
  TeamDetail,
  TeamGameweekDetail,
} from '@/types/team';

export async function getMyTeam(season: string): Promise<MyTeamRef> {
  const { data } = await apiClient.get<MyTeamRef>('/api/me/team', {
    params: { season },
  });
  return data;
}

export async function getMyTeamOrNull(season: string): Promise<MyTeamRef | null> {
  try {
    return await getMyTeam(season);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      (error as { error: string }).error === 'No team found for this season'
    ) {
      return null;
    }
    throw error;
  }
}

export async function getTeam(id: string, gameweek?: number): Promise<TeamDetail> {
  const { data } = await apiClient.get<TeamDetail>(`/api/teams/${id}`, {
    params: gameweek ? { gameweek } : undefined,
  });
  return data;
}

export async function createTeam(input: CreateTeamInput): Promise<TeamDetail> {
  const { data } = await apiClient.post<TeamDetail>('/api/teams', input);
  return data;
}

export async function setCaptain(
  teamId: string,
  input: SetCaptainInput,
): Promise<TeamDetail> {
  const { data } = await apiClient.patch<TeamDetail>(`/api/teams/${teamId}/captain`, input);
  return data;
}

export async function setLineup(
  teamId: string,
  input: SetLineupInput,
): Promise<TeamDetail> {
  const { data } = await apiClient.patch<TeamDetail>(`/api/teams/${teamId}/lineup`, input);
  return data;
}

export async function getTeamGameweekBreakdown(
  teamId: string,
  gameweek: number,
): Promise<TeamGameweekDetail> {
  const { data } = await apiClient.get<TeamGameweekDetail>(
    `/api/teams/${teamId}/gameweeks/${gameweek}`,
  );
  return data;
}

export interface TeamHistoryRow {
  gameweek: number;
  status: string;
  points: number | null;
  transferHit: number | null;
  transfersMade: number;
  chip: string | null;
  totalPointsCumulative: number;
}

export interface TeamHistoryResponse {
  teamId: string;
  name: string;
  season: string;
  totalPoints: number;
  history: TeamHistoryRow[];
}

export async function getTeamHistory(
  teamId: string,
  season?: string,
): Promise<TeamHistoryResponse> {
  const { data } = await apiClient.get<TeamHistoryResponse>(`/api/teams/${teamId}/history`, {
    params: season ? { season } : undefined,
  });
  return data;
}
