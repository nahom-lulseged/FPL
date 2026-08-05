import type { PaginatedResponse } from '@/types/ingestionStatus';

export interface AdminPlayer {
  id: string;
  fplId: number | null;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  isAvailable: boolean;
  injuryNote: string | null;
  isManualOverride: boolean;
  realTeam: {
    id: string;
    name: string;
    shortName: string;
  };
}

export interface AdminRealTeam {
  id: string;
  fplId: number | null;
  name: string;
  shortName: string;
  crestUrl: string | null;
  isManualOverride: boolean;
}

export interface AdminFixture {
  id: string;
  fplId: number | null;
  kickoffTime: string;
  homeScore: number | null;
  awayScore: number | null;
  started: boolean;
  minutes: number | null;
  finished: boolean;
  isPostponed: boolean;
  isManualOverride: boolean;
  gameweek: {
    id: string;
    number: number;
    deadline: string;
    status: string;
  };
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
  };
}

export interface AdminPlayerHistoryRow {
  gameweek: number;
  status: string;
  points: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  bonus: number;
  wasHome: boolean | null;
  value: number | null;
  opponent: { id: string; name: string; shortName: string } | null;
}

export interface AdminPlayerSeasonHistoryRow {
  seasonName: string;
  startCost: number;
  endCost: number;
  totalPoints: number;
  minutes: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
}

export interface AdminPlayerDetail extends AdminPlayer {
  totalPoints?: number;
  eventPoints?: number;
  selectedByPercent?: number;
  minutes?: number;
  goalsScored?: number;
  assists?: number;
  cleanSheets?: number;
  history?: AdminPlayerHistoryRow[];
  historyPast?: AdminPlayerSeasonHistoryRow[];
  upcomingFixtures?: unknown[];
}

export interface AdminGameweek {
  id: string;
  number: number;
  deadline: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  isCurrent: boolean;
  isManualOverride: boolean;
}

export type AdminPlayersResponse = PaginatedResponse<AdminPlayer>;
export type AdminRealTeamsResponse = PaginatedResponse<AdminRealTeam>;
export type AdminFixturesResponse = PaginatedResponse<AdminFixture>;
export type AdminGameweeksResponse = PaginatedResponse<AdminGameweek>;

export interface UpdatePlayerBody {
  name?: string;
  price?: number;
  isAvailable?: boolean;
  injuryNote?: string | null;
}

export interface UpdateRealTeamBody {
  shortName?: string;
  crestUrl?: string | null;
}

export interface UpdateFixtureBody {
  kickoffTime?: string;
  isPostponed?: boolean;
}

export interface UpdateGameweekBody {
  deadline?: string;
  status?: 'UPCOMING' | 'LIVE' | 'FINISHED';
  isCurrent?: boolean;
}
