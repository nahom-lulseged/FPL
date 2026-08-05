export interface FplCatalogTeam {
  id: number;
  name: string;
  short_name: string;
  shortName: string;
  code?: number;
  position?: number;
  played?: number;
  win?: number;
  draw?: number;
  loss?: number;
  points?: number;
  crestUrl: string;
}

export interface FplCatalogGameweek {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

export interface FplCatalogOverview {
  source: string;
  fetchedAt: string;
  totalManagers: number | null;
  counts: { teams: number; players: number; gameweeks: number; fixtures: number };
  currentGameweek: FplCatalogGameweek | null;
  nextGameweek: FplCatalogGameweek | null;
  teams: FplCatalogTeam[];
  positions: Array<Record<string, unknown>>;
  gameSettings: Record<string, unknown>;
}

export interface FplCatalogPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  total_points: number;
  event_points: number;
  form: string;
  selectedByPercent: number;
  teamDetails: FplCatalogTeam | null;
}

export interface FplCatalogFixture {
  id: number;
  event: number | null;
  kickoff_time: string;
  started: boolean;
  finished: boolean;
  minutes: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  homeTeam: FplCatalogTeam | null;
  awayTeam: FplCatalogTeam | null;
}

