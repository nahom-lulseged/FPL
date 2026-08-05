import type { ChipType } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { buildTeamResponse } from '../teams/teams.service';
import { assertBeforeDeadline, assertTeamOwner } from '../teams/teamGuards';
import * as teamsRepository from '../teams/teams.repository';
import {
  buildChipAvailability,
  canPlayChip,
  chipPlayErrorMessage,
  type ChipUsageRecord,
} from './chips.rules';
import * as chipsRepository from './chips.repository';
import type { SquadBackup } from './chips.repository';
import type { ChipTypeParam, PlayWildcardInput } from './chips.validation';
import { CHIP_TYPE_PARAM_TO_ENUM } from './chips.validation';
import { getTransferGameweek } from '../gameweeks/gameweeks.service';

function toChipUsageRecords(
  rows: Awaited<ReturnType<typeof chipsRepository.findChipUsagesForTeam>>,
): ChipUsageRecord[] {
  return rows.map((row) => ({
    chipType: row.chipType,
    gameweekNumber: row.gameweekNumber,
    wildcardNumber: row.wildcardNumber,
  }));
}

function buildSquadBackup(
  team: NonNullable<
    Awaited<ReturnType<typeof teamsRepository.findTeamWithSquad>>['team']
  >,
): SquadBackup {
  return {
    squad: team.squad.map((entry) => ({
      playerId: entry.playerId,
      position: entry.position,
      isStarter: entry.isStarter,
      benchOrder: entry.benchOrder,
      isCaptain: entry.isCaptain,
      isViceCaptain: entry.isViceCaptain,
    })),
    bankBalance: team.bankBalance,
    squadValue: team.squadValue,
    freeTransfers: team.freeTransfers,
  };
}

export async function playChip(
  userId: string,
  teamId: string,
  chipTypeParam: ChipTypeParam,
  body?: PlayWildcardInput,
) {
  await assertTeamOwner(userId, teamId);
  const gameweek = await getTransferGameweek();
  if (!gameweek) {
    throw new AppError(403, 'Chips are locked because no future gameweek deadline is available');
  }
  await assertBeforeDeadline(gameweek);

  const chipType = CHIP_TYPE_PARAM_TO_ENUM[chipTypeParam] as ChipType;

  const team = await teamsRepository.findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const usages = await chipsRepository.findChipUsagesForTeam(teamId, team.season);
  const usageRecords = toChipUsageRecords(usages);

  const playCheck = canPlayChip(
    chipType,
    usageRecords,
    gameweek.number,
    body?.wildcardNumber,
  );
  if (!playCheck.ok) {
    throw new AppError(400, chipPlayErrorMessage(playCheck.error));
  }

  let squadBackup: SquadBackup | undefined;
  if (chipType === 'FREE_HIT') {
    const { team: teamWithSquad } = await teamsRepository.findTeamWithSquad(teamId);
    if (!teamWithSquad) {
      throw new AppError(404, 'Team not found');
    }
    squadBackup = buildSquadBackup(teamWithSquad);
  }

  const chipUsage = await chipsRepository.createChipUsage({
    teamId,
    chipType,
    gameweekNumber: gameweek.number,
    season: team.season,
    wildcardNumber: body?.wildcardNumber,
    squadBackup,
  });

  await chipsRepository.resetTransferHitForGameweek(teamId, gameweek.id);

  const teamResponse = await buildTeamResponse(teamId);

  return {
    ...teamResponse,
    chipPlayed: {
      chipType: chipUsage.chipType,
      gameweekNumber: chipUsage.gameweekNumber,
      wildcardNumber: chipUsage.wildcardNumber,
      usedAt: chipUsage.usedAt,
    },
  };
}

export async function getChipStatus(teamId: string) {
  const team = await teamsRepository.findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const gameweek = await getTransferGameweek() ?? await teamsRepository.findCurrentGameweek();
  const gwNumber = gameweek?.number ?? 1;

  const usages = await chipsRepository.findChipUsagesForTeam(teamId, team.season);
  const activeChip = usages.find((u) => u.gameweekNumber === gwNumber);

  return {
    targetGameweekNumber: gameweek?.number ?? null,
    activeThisGameweek: activeChip?.chipType ?? null,
    availability: buildChipAvailability(
      usages.map((u) => ({
        chipType: u.chipType,
        gameweekNumber: u.gameweekNumber,
        wildcardNumber: u.wildcardNumber,
      })),
      gwNumber,
    ),
    history: usages.map((u) => ({
      chipType: u.chipType,
      gameweekNumber: u.gameweekNumber,
      wildcardNumber: u.wildcardNumber,
      usedAt: u.usedAt,
    })),
  };
}

export async function cancelChip(
  userId: string,
  teamId: string,
  chipTypeParam: 'bench-boost' | 'triple-captain',
) {
  await assertTeamOwner(userId, teamId);
  const gameweek = await getTransferGameweek();
  if (!gameweek) {
    throw new AppError(403, 'Chips are locked because no future gameweek deadline is available');
  }
  await assertBeforeDeadline(gameweek);

  const team = await teamsRepository.findTeamById(teamId);
  if (!team) throw new AppError(404, 'Team not found');

  const chipType = chipTypeParam === 'bench-boost' ? 'BENCH_BOOST' : 'TRIPLE_CAPTAIN';
  const deleted = await chipsRepository.deleteChipUsage(
    teamId,
    team.season,
    gameweek.number,
    chipType,
  );
  if (!deleted) throw new AppError(404, 'No active cancellable chip found for this gameweek');
  return buildTeamResponse(teamId);
}

export { getActiveChipContext } from './chips.repository';
