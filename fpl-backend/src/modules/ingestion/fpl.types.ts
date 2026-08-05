export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  code?: number;
  pulse_id?: number;
  position?: number;
  played?: number;
  win?: number;
  draw?: number;
  loss?: number;
  points?: number;
  strength?: number;
  [key: string]: unknown;
}

export interface FplElement {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number;
  team: number;
  now_cost: number;
  status: string;
  chance_of_playing_next_round?: number | null;
  total_points: number;
  event_points: number;
  selected_by_percent: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  [key: string]: unknown;
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  [key: string]: unknown;
}

export interface FplBootstrapStatic {
  teams: FplTeam[];
  elements: FplElement[];
  events: FplEvent[];
  element_types?: Array<Record<string, unknown>>;
  element_stats?: Array<Record<string, unknown>>;
  phases?: Array<Record<string, unknown>>;
  game_settings?: Record<string, unknown>;
  total_players?: number;
  [key: string]: unknown;
}

export interface FplFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  kickoff_time: string;
  started?: boolean;
  minutes?: number;
  finished: boolean;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

export interface FplElementHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number | null;
  team_a_score: number | null;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  value: number;
}

export interface FplElementHistoryPast {
  season_name: string;
  element_code: number;
  start_cost: number;
  end_cost: number;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  influence?: string;
  creativity?: string;
  threat?: string;
  ict_index?: string;
}

export interface FplElementSummary {
  fixtures: unknown[];
  history: FplElementHistory[];
  history_past: FplElementHistoryPast[];
}

export interface FplElementStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  bps: number;
  bonus: number;
  total_points: number;
}

export interface FplLiveElement {
  id: number;
  stats: FplElementStats;
}

export interface FplGameweekLive {
  elements: FplLiveElement[];
}

export interface RealTeamUpsert {
  fplId: number;
  name: string;
  shortName: string;
  crestUrl: string;
}

export interface PlayerUpsert {
  fplId: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  realTeamFplId: number;
  isAvailable: boolean;
  availabilityStatus: string;
  chanceOfPlayingNextRound: number | null;
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

export interface GameweekUpsert {
  number: number;
  deadline: Date;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  isCurrent: boolean;
}

export interface FixtureUpsert {
  fplId: number;
  gameweekNumber: number;
  homeTeamFplId: number;
  awayTeamFplId: number;
  kickoffTime: Date;
  homeScore: number | null;
  awayScore: number | null;
  homeDifficulty: number;
  awayDifficulty: number;
  started: boolean;
  minutes: number | null;
  finished: boolean;
}

export interface PlayerGameweekStatsUpsert {
  playerFplId: number;
  gameweekNumber: number;
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
  points: number;
  wasHome?: boolean | null;
  opponentTeamFplId?: number | null;
  fixtureFplId?: number | null;
  value?: number | null;
}

export interface PlayerSeasonHistoryUpsert {
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

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
}
