import type { LeagueType } from '@prisma/client';

export interface AdminLeagueCreator {
  id: string;
  email: string | null;
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

export interface AdminLeagueMember {
  id: string;
  userId: string;
  email: string | null;
  displayName: string;
  teamId: string;
  teamName: string;
  joinedAt: string;
}

export interface AdminLeagueStandingRow {
  rank: number;
  userId: string;
  teamId: string;
  teamName: string;
  managerName: string;
  totalPoints: number;
  gameweekPoints: number | null;
  chipsUsed: Array<{ chipType: string; gameweekNumber: number }>;
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
  standings: AdminLeagueStandingRow[];
  currentGameweek: number | null;
}
