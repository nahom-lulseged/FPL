import { apiClient } from '@/api/client';
import type { Gameweek, GameweeksListResponse, TransferWindow } from '@/types/gameweek';

export async function listGameweeks(): Promise<Gameweek[]> {
  const { data } = await apiClient.get<GameweeksListResponse>('/api/gameweeks');
  return data.data;
}

export async function getCurrentGameweek(): Promise<Gameweek> {
  const { data } = await apiClient.get<Gameweek>('/api/gameweeks/current');
  return data;
}

export async function getTransferWindow(): Promise<TransferWindow> {
  const { data } = await apiClient.get<TransferWindow>('/api/gameweeks/transfer-window');
  return data;
}
