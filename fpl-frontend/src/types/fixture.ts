import type { RealTeamRef } from '@/types/player';

export interface GameweekRef {
  id: string;
  number: number;
  deadline: string;
  status: string;
}

export interface FixtureListItem {
  id: string;
  fplId: number | null;
  kickoffTime: string;
  homeScore: number | null;
  awayScore: number | null;
  homeDifficulty: number | null;
  awayDifficulty: number | null;
  started: boolean;
  minutes: number | null;
  finished: boolean;
  gameweek: GameweekRef;
  homeTeam: RealTeamRef;
  awayTeam: RealTeamRef;
  fdrForTeam?: number;
}

export interface ListFixturesParams {
  gameweek?: number;
  teamId?: string;
  isPostponed?: boolean;
  page?: number;
  limit?: number;
}
