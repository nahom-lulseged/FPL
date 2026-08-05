import { apiClient } from '@/api/client';
import type { ChipStatus, ChipTypeParam, PlayChipResponse, PlayWildcardInput } from '@/types/chip';
import type { TeamDetail } from '@/types/team';

export async function getChipStatus(teamId: string): Promise<ChipStatus> {
  const { data } = await apiClient.get<ChipStatus>(`/api/teams/${teamId}/chips`);
  return data;
}

export async function playChip(
  teamId: string,
  chipType: ChipTypeParam,
  body?: PlayWildcardInput,
): Promise<PlayChipResponse> {
  const { data } = await apiClient.post<PlayChipResponse>(
    `/api/teams/${teamId}/chips/${chipType}`,
    body ?? {},
  );
  return data;
}

export async function cancelChip(
  teamId: string,
  chipType: 'bench-boost' | 'triple-captain',
): Promise<TeamDetail> {
  const { data } = await apiClient.delete<TeamDetail>(
    `/api/teams/${teamId}/chips/${chipType}`,
  );
  return data;
}
