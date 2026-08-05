import type { ChipType } from '@/types/chip';

export type LeagueType = 'CLASSIC' | 'HEAD_TO_HEAD';

export interface LeagueSummary {
  id: string;
  name: string;
  type: LeagueType;
  inviteCode?: string;
  adminUserId: string;
  season: string;
  memberCount: number;
  isAdmin: boolean;
  stakeAmountMinor?: number | null;
  isPrivate?: boolean;
  potTotalMinor?: number;
  payoutStatus?: 'OPEN' | 'LOCKED' | 'DISTRIBUTED';
  payoutSplitConfig?: {
    ranks: Array<{ place: number; percentBps: number }>;
    platformPercentBps: number;
    termsVersion?: string;
  } | null;
  isStaked?: boolean;
  createdAt: string;
  updatedAt: string;
  joinedAt?: string;
}

export interface CreateLeagueInput {
  name: string;
  type: 'CLASSIC';
  season?: string;
  stakeAmountMinor?: number;
  isPrivate?: boolean;
}

export interface JoinLeagueInput {
  inviteCode: string;
}

export interface LeagueChipUsed {
  chipType: ChipType;
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
  chipsUsed: LeagueChipUsed[];
}

export interface LeagueStandingsResponse {
  leagueId: string;
  type: 'CLASSIC';
  currentGameweek: number | null;
  data: ClassicStandingRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
