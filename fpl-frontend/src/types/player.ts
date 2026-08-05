export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface RealTeamRef {
  id: string;
  name: string;
  shortName: string;
  crestUrl?: string | null;
}

export type PlayerSortField =
  | 'totalPoints'
  | 'eventPoints'
  | 'price'
  | 'selectedByPercent'
  | 'minutes'
  | 'goalsScored'
  | 'assists'
  | 'cleanSheets'
  | 'goalsConceded'
  | 'ownGoals'
  | 'penaltiesSaved';

export interface PlayerStats {
  totalPoints: number;
  eventPoints: number;
  selectedByPercent: number;
  minutes: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  ownGoals: number;
  penaltiesSaved: number;
}

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  totalPoints: 0,
  eventPoints: 0,
  selectedByPercent: 0,
  minutes: 0,
  goalsScored: 0,
  assists: 0,
  cleanSheets: 0,
  goalsConceded: 0,
  ownGoals: 0,
  penaltiesSaved: 0,
};

export interface PlayerListItem extends PlayerStats {
  id: string;
  name: string;
  position: Position;
  price: number;
  isAvailable: boolean;
  availabilityStatus?: string;
  chanceOfPlayingNextRound?: number | null;
  realTeam: RealTeamRef;
  /** Short code of the next opponent (for example "ARS", "LIV"). */
  nextOpponentShortName?: string;
  /** "H" or "A", derived from whether the player's team is home or away in the next fixture. */
  nextFixtureVenue?: 'H' | 'A';
  /** Coverage / ownership-style stat for the player's next fixture (shown as "COV"). */
  nextFixtureCov?: number;
}

export interface Player {
  id: string;
  fplId: number | null;
  name: string;
  position: Position;
  price: number;
  realTeamId: string;
  isAvailable: boolean;
  availabilityStatus?: string;
  chanceOfPlayingNextRound?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBounds {
  min: number;
  max: number;
  q1: number;
  q2: number;
  q3: number;
}

export interface ListPlayersParams {
  position?: Position;
  teamId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  /** Comma-separated player IDs (e.g. watchlist). */
  ids?: string;
  sortBy?: PlayerSortField;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  opponentShortName?: string;
}
