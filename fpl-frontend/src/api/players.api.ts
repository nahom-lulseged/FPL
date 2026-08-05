import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@/types/api';
import {
  DEFAULT_PLAYER_STATS,
  type ListPlayersParams,
  type PlayerListItem,
  type RealTeamRef,
} from '@/types/player';

function normalizePlayerListItem(raw: PlayerListItem): PlayerListItem {
  return { ...DEFAULT_PLAYER_STATS, ...raw };
}

export async function listPlayers(
  params: ListPlayersParams = {},
): Promise<PaginatedResponse<PlayerListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<PlayerListItem>>('/api/players', {
    params,
  });
  return {
    ...data,
    data: data.data.map(normalizePlayerListItem),
  };
}

export interface PlayerUpcomingFixture {
  id: string;
  kickoffTime: string;
  finished: boolean;
  started?: boolean;
  minutes?: number | null;
  fdr: number | null;
  isHome: boolean;
  opponent: RealTeamRef;
  gameweek: { number: number };
}

export interface PlayerHistoryRow {
  gameweek: number;
  status: string;
  points: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  goalsConceded: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  bonus: number;
  bps: number;
  wasHome: boolean | null;
  fixtureFplId: number | null;
  value: number | null;
  opponent: RealTeamRef | null;
}

export interface PlayerSeasonHistoryRow {
  seasonName: string;
  startCost: number;
  endCost: number;
  totalPoints: number;
  minutes: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  influence: number | null;
  creativity: number | null;
  threat: number | null;
  ictIndex: number | null;
}

export interface PlayerDetail extends PlayerListItem {
  fplId?: number | null;
  injuryNote?: string | null;
  upcomingFixtures: PlayerUpcomingFixture[];
  history?: PlayerHistoryRow[];
  historyPast?: PlayerSeasonHistoryRow[];
}

export async function getPlayer(id: string): Promise<PlayerDetail> {
  const { data } = await apiClient.get<PlayerDetail>(`/api/players/${id}`);
  return normalizePlayerListItem(data) as PlayerDetail;
}

export async function listRealTeams(): Promise<{ data: RealTeamRef[] }> {
  const { data } = await apiClient.get<{ data: RealTeamRef[] }>('/api/real-teams');
  return data;
}

const AUTO_PICK_PAGE_LIMIT = 100;

export async function fetchAllPlayersForAutoPick(): Promise<PlayerListItem[]> {
  const first = await listPlayers({ page: 1, limit: AUTO_PICK_PAGE_LIMIT });
  const players = [...first.data];

  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = await listPlayers({ page, limit: AUTO_PICK_PAGE_LIMIT });
    players.push(...next.data);
  }

  return players;
}
