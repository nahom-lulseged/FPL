import { GameweekStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { getActiveChipContext } from '../chips/chips.repository';
import { scoreTeamGameweek } from './scoring.engine';
import * as scoringRepository from './scoring.repository';
import type { PlayerGwInput, PlayerScoreBreakdown, TeamGameweekResult } from './scoring.types';

function effectivePlayerPoints(stats: {
  points: number;
  bonus: number;
  provisionalBonus: number | null;
}): number {
  if (stats.bonus > 0) {
    return stats.points;
  }
  return stats.points + (stats.provisionalBonus ?? 0);
}

async function loadStatsForGameweek(
  gameweekId: string,
): Promise<Map<string, PlayerGwInput>> {
  const stats = await scoringRepository.findPlayerStatsForGameweek(gameweekId);
  return new Map(
    stats.map((s) => [
      s.playerId,
      {
        playerId: s.playerId,
        position: s.player.position,
        minutes: s.minutes,
        points: effectivePlayerPoints(s),
      },
    ]),
  );
}

export async function computeTeamGameweekScore(
  teamId: string,
  gameweekId: string,
): Promise<TeamGameweekResult | null> {
  const snapshotRows = await scoringRepository.findSnapshotForTeam(teamId, gameweekId);
  if (snapshotRows.length === 0) {
    return null;
  }

  const snapshot = scoringRepository.toSnapshotSlots(snapshotRows);
  const statsByPlayerId = await loadStatsForGameweek(gameweekId);
  const existingScore = await scoringRepository.findTeamGameweekScore(teamId, gameweekId);
  const transferHit = existingScore?.transferHit ?? 0;

  const gameweek = await scoringRepository.findGameweekById(gameweekId);
  const team = await scoringRepository.findTeamSeason(teamId);
  const chipOptions =
    gameweek && team
      ? await getActiveChipContext(teamId, team.season, gameweek.number).then((ctx) => ({
          benchBoost: ctx.benchBoost,
          tripleCaptain: ctx.tripleCaptain,
        }))
      : {};

  return scoreTeamGameweek(snapshot, statsByPlayerId, transferHit, chipOptions);
}

export async function getOrComputeTeamGameweekScore(
  teamId: string,
  gameweekId: string,
  status: GameweekStatus,
): Promise<TeamGameweekResult | null> {
  if (status === 'UPCOMING') {
    return null;
  }

  const stored = await scoringRepository.findTeamGameweekScore(teamId, gameweekId);
  if (stored && status === 'FINISHED') {
    return {
      startersPoints: stored.startersPoints,
      captainBonus: stored.captainBonus,
      benchPoints: stored.benchPoints,
      transferHit: stored.transferHit,
      totalPoints: stored.totalPoints,
      players: stored.breakdown as unknown as PlayerScoreBreakdown[],
    };
  }

  const computed = await computeTeamGameweekScore(teamId, gameweekId);
  if (computed && status === 'LIVE') {
    return computed;
  }

  if (stored) {
    return {
      startersPoints: stored.startersPoints,
      captainBonus: stored.captainBonus,
      benchPoints: stored.benchPoints,
      transferHit: stored.transferHit,
      totalPoints: stored.totalPoints,
      players: stored.breakdown as unknown as PlayerScoreBreakdown[],
    };
  }

  return computed;
}

export async function syncSquadSnapshotFromTeam(teamId: string): Promise<void> {
  const { findCurrentGameweek, findTeamWithSquad } = await import(
    '../teams/teams.repository'
  );
  const gameweek = await findCurrentGameweek();
  if (!gameweek) {
    return;
  }

  const { team } = await findTeamWithSquad(teamId);
  if (!team) {
    return;
  }

  const slots = team.squad.map((entry) => ({
    playerId: entry.playerId,
    position: entry.position,
    isStarter: entry.isStarter,
    benchOrder: entry.benchOrder,
    isCaptain: entry.isCaptain,
    isViceCaptain: entry.isViceCaptain,
  }));

  await scoringRepository.upsertSquadSnapshot(teamId, gameweek.id, slots);
}

export async function getTeamGameweekBreakdown(teamId: string, gameweekNumber: number) {
  const gameweek = await scoringRepository.findGameweekByNumber(gameweekNumber);
  if (!gameweek) {
    throw new AppError(404, 'Gameweek not found');
  }

  const { findTeamById } = await import('../teams/teams.repository');
  const team = await findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const snapshotRows = await scoringRepository.findSnapshotForTeam(teamId, gameweek.id);
  const { findPlayersByIds } = await import('../teams/teams.repository');
  const playerIds = snapshotRows.map((s) => s.playerId);
  const players = await findPlayersByIds(playerIds);
  const playerById = new Map(players.map((p) => [p.id, p]));

  const score =
    gameweek.status === 'UPCOMING'
      ? null
      : await getOrComputeTeamGameweekScore(teamId, gameweek.id, gameweek.status);

  const breakdownByPlayerId = new Map(
    score?.players.map((p) => [p.playerId, p]) ?? [],
  );

  const eventStatsRows =
    gameweek.status === 'UPCOMING'
      ? []
      : await scoringRepository.findPlayerEventStatsForGameweek(gameweek.id, playerIds);

  const eventStatsByPlayerId = new Map(
    eventStatsRows.map((s) => [
      s.playerId,
      {
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        cleanSheet: s.cleanSheet,
        goalsConceded: s.goalsConceded,
        saves: s.saves,
        yellowCards: s.yellowCards,
        redCards: s.redCards,
        ownGoals: s.ownGoals,
        penaltiesMissed: s.penaltiesMissed,
        penaltiesSaved: s.penaltiesSaved,
        bonus: s.bonus,
        bps: s.bps,
        points: s.points,
        provisionalBonus: s.provisionalBonus,
      },
    ]),
  );

  return {
    teamId: team.id,
    gameweek: {
      number: gameweek.number,
      status: gameweek.status,
    },
    startersPoints: score?.startersPoints ?? null,
    captainBonus: score?.captainBonus ?? null,
    benchPoints: score?.benchPoints ?? null,
    transferHit: score?.transferHit ?? null,
    totalPoints: score?.totalPoints ?? null,
    players: snapshotRows.map((slot) => {
      const player = playerById.get(slot.playerId);
      const breakdown = breakdownByPlayerId.get(slot.playerId);
      return {
        playerId: slot.playerId,
        name: player?.name ?? '',
        position: slot.position,
        isStarter: slot.isStarter,
        benchOrder: slot.benchOrder,
        isCaptain: slot.isCaptain,
        isViceCaptain: slot.isViceCaptain,
        rawPoints: breakdown?.rawPoints ?? null,
        counted: breakdown?.counted ?? null,
        wasSubstitutedIn: breakdown?.wasSubstitutedIn ?? null,
        wasSubstitutedOut: breakdown?.wasSubstitutedOut ?? null,
        captainMultiplier: breakdown?.captainMultiplier ?? null,
        effectivePoints: breakdown?.effectivePoints ?? null,
        eventStats: eventStatsByPlayerId.get(slot.playerId) ?? null,
      };
    }),
  };
}
