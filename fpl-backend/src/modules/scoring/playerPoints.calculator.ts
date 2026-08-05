import type { Position } from '@prisma/client';

export const CORRECTABLE_STAT_TYPES = [
  'minutes',
  'goals',
  'assists',
  'cleanSheet',
  'goalsConceded',
  'saves',
  'yellowCards',
  'redCards',
  'ownGoals',
  'penaltiesMissed',
  'penaltiesSaved',
  'bonus',
  'bps',
] as const;

export type CorrectableStatType = (typeof CORRECTABLE_STAT_TYPES)[number];

export interface PlayerStatsInput {
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
}

function goalPoints(position: Position): number {
  if (position === 'GK' || position === 'DEF') {
    return 6;
  }
  if (position === 'MID') {
    return 5;
  }
  return 4;
}

function appearancePoints(minutes: number): number {
  if (minutes <= 0) {
    return 0;
  }
  if (minutes < 60) {
    return 1;
  }
  return 2;
}

function cleanSheetPoints(
  position: Position,
  minutes: number,
  cleanSheet: boolean,
): number {
  if (!cleanSheet || minutes < 60) {
    return 0;
  }
  if (position === 'GK' || position === 'DEF') {
    return 4;
  }
  if (position === 'MID') {
    return 1;
  }
  return 0;
}

function goalsConcededPoints(
  position: Position,
  minutes: number,
  goalsConceded: number,
): number {
  if (minutes < 60 || (position !== 'GK' && position !== 'DEF')) {
    return 0;
  }
  return -Math.floor(goalsConceded / 2);
}

function savesPoints(saves: number): number {
  return Math.floor(saves / 3);
}

/** Standard FPL scoring formula (excluding provisional bonus — use `bonus` field). */
export function calculatePlayerPoints(
  stats: PlayerStatsInput,
  position: Position,
): number {
  let total = appearancePoints(stats.minutes);
  total += stats.goals * goalPoints(position);
  total += stats.assists * 3;
  total += cleanSheetPoints(position, stats.minutes, stats.cleanSheet);
  total += goalsConcededPoints(position, stats.minutes, stats.goalsConceded);
  total += savesPoints(stats.saves);
  total += stats.penaltiesSaved * 5;
  total += stats.penaltiesMissed * -2;
  total += stats.yellowCards * -1;
  total += stats.redCards * -3;
  total += stats.ownGoals * -2;
  total += stats.bonus;
  return total;
}

export function toPlayerStatsInput(row: {
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
}): PlayerStatsInput {
  return {
    minutes: row.minutes,
    goals: row.goals,
    assists: row.assists,
    cleanSheet: row.cleanSheet,
    goalsConceded: row.goalsConceded,
    saves: row.saves,
    yellowCards: row.yellowCards,
    redCards: row.redCards,
    ownGoals: row.ownGoals,
    penaltiesMissed: row.penaltiesMissed,
    penaltiesSaved: row.penaltiesSaved,
    bonus: row.bonus,
    bps: row.bps,
  };
}

export function applyStatCorrection(
  current: PlayerStatsInput,
  statType: CorrectableStatType,
  newValue: number | boolean,
  position: Position,
): { stats: PlayerStatsInput; points: number } {
  const updated = { ...current };

  switch (statType) {
    case 'minutes':
      updated.minutes = newValue as number;
      break;
    case 'goals':
      updated.goals = newValue as number;
      break;
    case 'assists':
      updated.assists = newValue as number;
      break;
    case 'cleanSheet':
      updated.cleanSheet = newValue as boolean;
      break;
    case 'goalsConceded':
      updated.goalsConceded = newValue as number;
      break;
    case 'saves':
      updated.saves = newValue as number;
      break;
    case 'yellowCards':
      updated.yellowCards = newValue as number;
      break;
    case 'redCards':
      updated.redCards = newValue as number;
      break;
    case 'ownGoals':
      updated.ownGoals = newValue as number;
      break;
    case 'penaltiesMissed':
      updated.penaltiesMissed = newValue as number;
      break;
    case 'penaltiesSaved':
      updated.penaltiesSaved = newValue as number;
      break;
    case 'bonus':
      updated.bonus = newValue as number;
      break;
    case 'bps':
      updated.bps = newValue as number;
      break;
    default:
      break;
  }

  return {
    stats: updated,
    points: calculatePlayerPoints(updated, position),
  };
}
