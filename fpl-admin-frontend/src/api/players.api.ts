import { apiClient } from '@/api/client';
import { updateAdminPlayer } from '@/api/content.api';
import type { PlayerListItem, PlayerOverrideBody, PlayersListResponse } from '@/types/player';

export async function listPlayers(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PlayersListResponse> {
  const { data } = await apiClient.get<PlayersListResponse>('/api/players', { params });
  return data;
}

export async function updatePlayerOverride(
  id: string,
  body: PlayerOverrideBody,
): Promise<PlayerListItem> {
  return updateAdminPlayer(id, body);
}
