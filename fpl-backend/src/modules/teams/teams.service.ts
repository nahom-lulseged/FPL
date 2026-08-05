import { GameweekStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { BUDGET_TENTHS } from '../../lib/constants';
import { getOrComputeTeamGameweekScore, syncSquadSnapshotFromTeam } from '../scoring/scoring.service';
import { getActiveChipContext } from '../chips/chips.repository';
import * as chipsRepository from '../chips/chips.repository';
import { canPlayChip, chipPlayErrorMessage } from '../chips/chips.rules';
import { getTransferGameweek } from '../gameweeks/gameweeks.service';
import {
  assignDefaultLineup,
  validateBudget,
  validateCaptaincy,
  validateFormation,
  validateFullSquad,
  validateMaxPerClub,
  validateSquadComposition,
} from './squadValidator';
import { assertBeforeDeadline, assertTeamOwner, assertValidation } from './teamGuards';
import * as teamsRepository from './teams.repository';
import type { LineupSlot, SquadPlayerInput } from './teams.types';
import type {
  CreateTeamInput,
  GetMyTeamQuery,
  GetTeamQuery,
  SetCaptainInput,
  SetLineupInput,
  TeamHistoryQuery,
} from './teams.validation';
import { prisma } from '../../config/db';

function toSquadPlayerInput(
  player: teamsRepository.PlayerWithTeam,
): SquadPlayerInput {
  return {
    playerId: player.id,
    position: player.position,
    price: player.price,
    realTeamId: player.realTeamId,
    isAvailable: player.isAvailable,
  };
}

function mapPointsStatus(status: GameweekStatus): 'pending' | 'provisional' | 'confirmed' {
  switch (status) {
    case 'UPCOMING':
      return 'pending';
    case 'LIVE':
      return 'provisional';
    case 'FINISHED':
      return 'confirmed';
  }
}

function resolveCreateLineup(
  input: CreateTeamInput,
  squadPlayers: SquadPlayerInput[],
): LineupSlot[] {
  if (!input.lineup) {
    return assignDefaultLineup(squadPlayers);
  }

  const playerIdSet = new Set(input.playerIds);
  const lineupIds = new Set(input.lineup.map((slot) => slot.playerId));

  if (lineupIds.size !== input.lineup.length) {
    throw new AppError(400, 'Lineup cannot contain duplicate players');
  }

  if (lineupIds.size !== playerIdSet.size) {
    throw new AppError(400, 'Lineup must include all squad players');
  }

  for (const id of lineupIds) {
    if (!playerIdSet.has(id)) {
      throw new AppError(400, 'Lineup contains players not in the squad');
    }
  }

  return input.lineup.map((slot) => ({
    playerId: slot.playerId,
    isStarter: slot.isStarter,
    benchOrder: slot.benchOrder,
    isCaptain: slot.isCaptain,
    isViceCaptain: slot.isViceCaptain,
  }));
}

export async function buildTeamResponse(teamId: string, gameweekNumber?: number) {
  const gameweek = gameweekNumber
    ? await teamsRepository.findGameweekByNumber(gameweekNumber)
    : await teamsRepository.findCurrentGameweek();

  const { team, statsByPlayerId } = await teamsRepository.findTeamWithSquad(
    teamId,
    gameweek?.id,
  );

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const pointsStatus = gameweek ? mapPointsStatus(gameweek.status) : 'pending';

  const teamScore =
    gameweek && gameweek.status !== 'UPCOMING'
      ? await getOrComputeTeamGameweekScore(teamId, gameweek.id, gameweek.status)
      : null;

  const breakdownByPlayerId = new Map(
    teamScore?.players.map((p) => [p.playerId, p]) ?? [],
  );

  const activeChip =
    gameweek
      ? await getActiveChipContext(team.id, team.season, gameweek.number)
      : null;

  return {
    id: team.id,
    name: team.name,
    season: team.season,
    bankBalance: team.bankBalance,
    squadValue: team.squadValue,
    totalPoints: team.totalPoints,
    freeTransfers: team.freeTransfers,
    activeChip: activeChip?.chipType ?? null,
    gameweek: gameweek
      ? {
          number: gameweek.number,
          status: gameweek.status,
        }
      : null,
    gameweekTotal: teamScore?.totalPoints ?? null,
    gameweekBreakdown: teamScore
      ? {
          startersPoints: teamScore.startersPoints,
          captainBonus: teamScore.captainBonus,
          benchPoints: teamScore.benchPoints,
          transferHit: teamScore.transferHit,
        }
      : null,
    squad: team.squad.map((entry) => {
      const breakdown = breakdownByPlayerId.get(entry.playerId);
      const rawPoints =
        pointsStatus === 'pending' ? null : (statsByPlayerId.get(entry.playerId) ?? 0);

      return {
        playerId: entry.playerId,
        position: entry.position,
        isStarter: entry.isStarter,
        benchOrder: entry.benchOrder,
        isCaptain: entry.isCaptain,
        isViceCaptain: entry.isViceCaptain,
        player: {
          name: entry.player.name,
          price: entry.player.price,
          availabilityStatus: entry.player.availabilityStatus,
          chanceOfPlayingNextRound: entry.player.chanceOfPlayingNextRound,
          realTeam: {
            id: entry.player.realTeam.id,
            name: entry.player.realTeam.name,
            shortName: entry.player.realTeam.shortName,
          },
        },
        rawPoints,
        gameweekPoints: breakdown?.effectivePoints ?? rawPoints,
        counted: breakdown?.counted ?? null,
        captainMultiplier: breakdown?.captainMultiplier ?? null,
        wasSubstitutedIn: breakdown?.wasSubstitutedIn ?? null,
        wasSubstitutedOut: breakdown?.wasSubstitutedOut ?? null,
        pointsStatus,
      };
    }),
  };
}

export async function createTeam(userId: string, input: CreateTeamInput) {
  const existing = await teamsRepository.findTeamByUserAndSeason(userId, input.season);
  if (existing) {
    throw new AppError(409, 'You already have a team for this season');
  }

  const players = await teamsRepository.findPlayersByIds(input.playerIds);
  if (players.length !== input.playerIds.length) {
    throw new AppError(400, 'One or more players were not found');
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const orderedPlayers = input.playerIds.map((id) => playerMap.get(id)!);
  const squadPlayers = orderedPlayers.map(toSquadPlayerInput);

  assertValidation(validateSquadComposition(squadPlayers));
  assertValidation(validateMaxPerClub(squadPlayers));
  assertValidation(validateBudget(squadPlayers));

  const lineup = resolveCreateLineup(input, squadPlayers);
  assertValidation(validateFullSquad(squadPlayers, lineup));

  const squadValue = squadPlayers.reduce((sum, p) => sum + p.price, 0);
  const bankBalance = BUDGET_TENTHS - squadValue;

  const team = await teamsRepository.createTeamWithSquad(
    {
      userId,
      name: input.name,
      season: input.season,
      bankBalance,
      squadValue,
    },
    lineup.map((slot) => {
      const player = playerMap.get(slot.playerId)!;
      return {
        playerId: slot.playerId,
        position: player.position,
        isStarter: slot.isStarter,
        benchOrder: slot.benchOrder,
        isCaptain: slot.isCaptain,
        isViceCaptain: slot.isViceCaptain,
      };
    }),
  );

  await syncSquadSnapshotFromTeam(team.id);

  return buildTeamResponse(team.id);
}

export async function getTeam(teamId: string, query: GetTeamQuery) {
  return buildTeamResponse(teamId, query.gameweek);
}

export async function getMyTeam(userId: string, query: GetMyTeamQuery) {
  const team = await teamsRepository.findTeamByUserAndSeason(userId, query.season);
  if (!team) {
    throw new AppError(404, 'No team found for this season');
  }
  return {
    teamId: team.id,
    name: team.name,
    season: team.season,
  };
}

export async function setCaptain(
  userId: string,
  teamId: string,
  input: SetCaptainInput,
) {
  await assertTeamOwner(userId, teamId);
  const targetGameweek = await getTransferGameweek();
  if (!targetGameweek) {
    throw new AppError(403, 'Captaincy is locked because no future gameweek deadline is available');
  }
  await assertBeforeDeadline(targetGameweek);

  const { team } = await teamsRepository.findTeamWithSquad(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const squadPlayerIds = new Set(team.squad.map((s) => s.playerId));
  if (!squadPlayerIds.has(input.captainId) || !squadPlayerIds.has(input.viceCaptainId)) {
    throw new AppError(400, 'Captain and vice-captain must be in the squad');
  }

  const lineup: LineupSlot[] = team.squad.map((s) => ({
    playerId: s.playerId,
    isStarter: s.isStarter,
    benchOrder: s.benchOrder,
    isCaptain: s.playerId === input.captainId,
    isViceCaptain: s.playerId === input.viceCaptainId,
  }));

  assertValidation(validateCaptaincy(lineup));
  await teamsRepository.updateCaptaincy(teamId, input.captainId, input.viceCaptainId);
  await syncSquadSnapshotFromTeam(teamId);

  return buildTeamResponse(teamId);
}

export async function setLineup(
  userId: string,
  teamId: string,
  input: SetLineupInput,
) {
  await assertTeamOwner(userId, teamId);
  const targetGameweek = await getTransferGameweek();
  if (!targetGameweek) {
    throw new AppError(403, 'Lineup is locked because no future gameweek deadline is available');
  }
  await assertBeforeDeadline(targetGameweek);

  const { team } = await teamsRepository.findTeamWithSquad(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const existingById = new Map(team.squad.map((s) => [s.playerId, s]));
  const incomingIds = new Set(input.lineup.map((l) => l.playerId));

  if (incomingIds.size !== input.lineup.length) {
    throw new AppError(400, 'Lineup cannot contain duplicate players');
  }

  if (incomingIds.size !== team.squad.length) {
    throw new AppError(400, 'Lineup must include all squad players');
  }

  for (const id of incomingIds) {
    if (!existingById.has(id)) {
      throw new AppError(400, 'Lineup contains players not in the squad');
    }
  }

  const hasCaptainUpdate =
    input.captainId !== undefined && input.viceCaptainId !== undefined;

  if (hasCaptainUpdate) {
    if (!incomingIds.has(input.captainId!) || !incomingIds.has(input.viceCaptainId!)) {
      throw new AppError(400, 'Captain and vice-captain must be in the squad');
    }
  }

  const merged: LineupSlot[] = input.lineup.map((slot) => {
    const existing = existingById.get(slot.playerId)!;
    return {
      playerId: slot.playerId,
      isStarter: slot.isStarter,
      benchOrder: slot.benchOrder,
      isCaptain: hasCaptainUpdate
        ? slot.playerId === input.captainId
        : existing.isCaptain,
      isViceCaptain: hasCaptainUpdate
        ? slot.playerId === input.viceCaptainId
        : existing.isViceCaptain,
    };
  });

  if (!hasCaptainUpdate) {
    const captainOnBench = merged.some((s) => s.isCaptain && !s.isStarter);
    const viceOnBench = merged.some((s) => s.isViceCaptain && !s.isStarter);
    if (captainOnBench || viceOnBench) {
      throw new AppError(400, 'Captain and vice-captain must remain in the starting XI');
    }
  }

  const positions = new Map(
    team.squad.map((s) => [s.playerId, s.position]),
  );
  assertValidation(validateFormation(merged, positions));
  if (hasCaptainUpdate) {
    assertValidation(validateCaptaincy(merged));
  }

  if (input.chipSelection) {
    const usages = await chipsRepository.findChipUsagesForTeam(teamId, team.season);
    const check = canPlayChip(
      input.chipSelection,
      usages.map((usage) => ({
        chipType: usage.chipType,
        gameweekNumber: usage.gameweekNumber,
        wildcardNumber: usage.wildcardNumber,
      })),
      targetGameweek.number,
    );
    if (!check.ok) throw new AppError(400, chipPlayErrorMessage(check.error));
    await teamsRepository.replaceLineupAndPlayChip(teamId, merged, {
      chipType: input.chipSelection,
      gameweekNumber: targetGameweek.number,
      season: team.season,
    });
  } else {
    await teamsRepository.replaceLineup(teamId, merged);
  }
  await syncSquadSnapshotFromTeam(teamId);

  return buildTeamResponse(teamId);
}

export async function getTeamHistory(teamId: string, query: TeamHistoryQuery) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, season: true, totalPoints: true },
  });

  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const season = query.season ?? team.season;

  const [gameweeks, scores, transfers, chips] = await Promise.all([
    prisma.gameweek.findMany({
      select: { id: true, number: true, status: true },
      orderBy: { number: 'asc' },
    }),
    prisma.teamGameweekScore.findMany({
      where: { teamId },
      select: {
        gameweekId: true,
        totalPoints: true,
        transferHit: true,
        startersPoints: true,
        captainBonus: true,
        benchPoints: true,
      },
    }),
    prisma.transfer.groupBy({
      by: ['gameweekId'],
      where: { teamId },
      _count: { _all: true },
    }),
    prisma.chipUsage.findMany({
      where: { teamId, season },
      select: { chipType: true, gameweekNumber: true },
    }),
  ]);

  const scoreByGwId = new Map(scores.map((row) => [row.gameweekId, row]));
  const transfersByGwId = new Map(
    transfers.map((row) => [row.gameweekId, row._count._all]),
  );
  const chipByGwNumber = new Map(
    chips.map((row) => [row.gameweekNumber, row.chipType]),
  );

  let cumulative = 0;
  const history = gameweeks.map((gw) => {
    const score = scoreByGwId.get(gw.id);
    const points = score?.totalPoints ?? null;
    if (points !== null) {
      cumulative += points;
    }

    return {
      gameweek: gw.number,
      status: gw.status,
      points,
      transferHit: score?.transferHit ?? null,
      transfersMade: transfersByGwId.get(gw.id) ?? 0,
      chip: chipByGwNumber.get(gw.number) ?? null,
      totalPointsCumulative: points === null ? cumulative : cumulative,
    };
  });

  return {
    teamId: team.id,
    name: team.name,
    season,
    totalPoints: team.totalPoints,
    history,
  };
}

export { getTeamGameweekBreakdown } from '../scoring/scoring.service';
