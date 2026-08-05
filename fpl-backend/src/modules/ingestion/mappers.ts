import type { Position } from '@prisma/client';
import type {
  FplBootstrapStatic,
  FplElement,
  FplElementHistory,
  FplElementHistoryPast,
  FplEvent,
  FplFixture,
  FplGameweekLive,
  FixtureUpsert,
  GameweekUpsert,
  PlayerGameweekStatsUpsert,
  PlayerSeasonHistoryUpsert,
  PlayerUpsert,
  RealTeamUpsert,
} from './fpl.types';

const ELEMENT_TYPE_TO_POSITION: Record<number, Position> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const AVAILABLE_STATUSES = new Set(['a', 'd']);

export function mapFplTeam(team: { id: number; name: string; short_name: string }): RealTeamUpsert {
  return {
    fplId: team.id,
    name: team.name,
    shortName: team.short_name,
    crestUrl: `/crests/${team.short_name.toUpperCase()}.webp`,
  };
}

export function mapFplTeams(bootstrap: FplBootstrapStatic): RealTeamUpsert[] {
  return bootstrap.teams.map(mapFplTeam);
}

export function mapFplElement(element: FplElement): PlayerUpsert {
  const position = ELEMENT_TYPE_TO_POSITION[element.element_type];
  if (!position) {
    throw new Error(`Unknown element_type: ${element.element_type}`);
  }

  const name =
    element.web_name ||
    `${element.first_name} ${element.second_name}`.trim();

  return {
    fplId: element.id,
    name,
    position,
    price: element.now_cost,
    realTeamFplId: element.team,
    isAvailable: AVAILABLE_STATUSES.has(element.status),
    availabilityStatus: element.status || 'a',
    chanceOfPlayingNextRound: element.chance_of_playing_next_round ?? null,
    totalPoints: element.total_points ?? 0,
    eventPoints: element.event_points ?? 0,
    selectedByPercent: parseFloat(element.selected_by_percent ?? '0') || 0,
    minutes: element.minutes ?? 0,
    goalsScored: element.goals_scored ?? 0,
    assists: element.assists ?? 0,
    cleanSheets: element.clean_sheets ?? 0,
    goalsConceded: element.goals_conceded ?? 0,
    ownGoals: element.own_goals ?? 0,
    penaltiesSaved: element.penalties_saved ?? 0,
  };
}

export function mapFplElements(bootstrap: FplBootstrapStatic): PlayerUpsert[] {
  return bootstrap.elements.map(mapFplElement);
}

export function mapFplEvent(event: FplEvent): GameweekUpsert {
  let status: GameweekUpsert['status'] = 'UPCOMING';
  if (event.finished) {
    status = 'FINISHED';
  } else if (event.is_current) {
    status = 'LIVE';
  }

  return {
    number: event.id,
    deadline: new Date(event.deadline_time),
    status,
    isCurrent: event.is_current,
  };
}

export function mapFplEvents(bootstrap: FplBootstrapStatic): GameweekUpsert[] {
  return bootstrap.events.map(mapFplEvent);
}

export function mapFplFixture(fixture: FplFixture): FixtureUpsert | null {
  if (fixture.event === null) {
    return null;
  }

  return {
    fplId: fixture.id,
    gameweekNumber: fixture.event,
    homeTeamFplId: fixture.team_h,
    awayTeamFplId: fixture.team_a,
    kickoffTime: new Date(fixture.kickoff_time),
    homeScore: fixture.team_h_score,
    awayScore: fixture.team_a_score,
    homeDifficulty: fixture.team_h_difficulty,
    awayDifficulty: fixture.team_a_difficulty,
    started: fixture.started ?? false,
    minutes: fixture.minutes ?? null,
    finished: fixture.finished,
  };
}

export function mapFplFixtures(fixtures: FplFixture[]): FixtureUpsert[] {
  return fixtures
    .map(mapFplFixture)
    .filter((f): f is FixtureUpsert => f !== null);
}

export function mapFplLiveStats(
  live: FplGameweekLive,
  gameweekNumber: number,
): PlayerGameweekStatsUpsert[] {
  return live.elements.map((element) => ({
    playerFplId: element.id,
    gameweekNumber,
    minutes: element.stats.minutes,
    goals: element.stats.goals_scored,
    assists: element.stats.assists,
    cleanSheet: element.stats.clean_sheets > 0,
    goalsConceded: element.stats.goals_conceded,
    saves: element.stats.saves,
    yellowCards: element.stats.yellow_cards,
    redCards: element.stats.red_cards,
    ownGoals: element.stats.own_goals,
    penaltiesMissed: element.stats.penalties_missed,
    penaltiesSaved: element.stats.penalties_saved,
    bonus: element.stats.bonus,
    bps: element.stats.bps,
    points: element.stats.total_points,
  }));
}

function parseOptionalFloat(value: string | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapFplElementHistory(
  history: FplElementHistory,
  playerFplId: number,
): PlayerGameweekStatsUpsert {
  return {
    playerFplId,
    gameweekNumber: history.round,
    minutes: history.minutes,
    goals: history.goals_scored,
    assists: history.assists,
    cleanSheet: history.clean_sheets > 0,
    goalsConceded: history.goals_conceded,
    saves: history.saves,
    yellowCards: history.yellow_cards,
    redCards: history.red_cards,
    ownGoals: history.own_goals,
    penaltiesMissed: history.penalties_missed,
    penaltiesSaved: history.penalties_saved,
    bonus: history.bonus,
    bps: history.bps,
    points: history.total_points,
    wasHome: history.was_home,
    opponentTeamFplId: history.opponent_team,
    fixtureFplId: history.fixture,
    value: history.value,
  };
}

export function mapFplElementHistoryPast(
  past: FplElementHistoryPast,
): PlayerSeasonHistoryUpsert {
  return {
    seasonName: past.season_name,
    startCost: past.start_cost,
    endCost: past.end_cost,
    totalPoints: past.total_points,
    minutes: past.minutes,
    goalsScored: past.goals_scored,
    assists: past.assists,
    cleanSheets: past.clean_sheets,
    influence: parseOptionalFloat(past.influence),
    creativity: parseOptionalFloat(past.creativity),
    threat: parseOptionalFloat(past.threat),
    ictIndex: parseOptionalFloat(past.ict_index),
  };
}
