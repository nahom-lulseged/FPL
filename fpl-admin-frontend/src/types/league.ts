import type { PaginatedResponse } from '@/types/ingestionStatus';

export type LeagueType = 'CLASSIC' | 'HEAD_TO_HEAD';

export interface AdminLeagueCreator {
  id: string;
  email: string;
  displayName: string;
}

export interface AdminLeagueListRow {
  id: string;
  name: string;
  type: LeagueType;
  memberCount: number;
  creator: AdminLeagueCreator;
  season: string;
  inviteCode: string;
  createdAt: string;
}

export interface AdminLeagueListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: LeagueType;
  sortBy?: 'createdAt' | 'memberCount' | 'name';
  sortDir?: 'asc' | 'desc';
}

export type AdminLeaguesListResponse = PaginatedResponse<AdminLeagueListRow>;

export interface AdminLeagueChipUsed {
  chipType: string;
  gameweekNumber: number;
}

export interface ClassicStandingRow {
  rank: number;
  userId: string;
  teamId: string;
  teamName: string;
  managerName: string;
  totalPoints: number;
  gameweekPoints: number | null;
  chipsUsed: AdminLeagueChipUsed[];
}

export interface AdminLeagueMember {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  teamId: string;
  teamName: string;
  joinedAt: string;
}

export interface AdminLeagueDetail {
  id: string;
  name: string;
  type: LeagueType;
  season: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  creator: AdminLeagueCreator;
  members: AdminLeagueMember[];
  standings: ClassicStandingRow[];
  currentGameweek: number | null;
}

export interface RemoveLeagueMemberResponse {
  removed: boolean;
  leagueId: string;
  userId: string;
  standings: ClassicStandingRow[];
  currentGameweek: number | null;
}

export interface DissolveLeagueResponse {
  dissolved: boolean;
  leagueId: string;
}
