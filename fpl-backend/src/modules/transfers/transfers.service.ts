import { AppError } from '../../middleware/errorHandler';
import { invalidateStandingsForTeam } from '../../lib/cache';
import { buildTeamResponse } from '../teams/teams.service';
import {
  validateBudget,
  validateCaptaincy,
  validateFormation,
  validateMaxPerClub,
  validateSquadComposition,
} from '../teams/squadValidator';
import { assertBeforeDeadline, assertTeamOwner, assertValidation } from '../teams/teamGuards';
import * as teamsRepository from '../teams/teams.repository';
import { getTransferGameweek } from '../gameweeks/gameweeks.service';
import type { LineupSlot, SquadPlayerInput } from '../teams/teams.types';
import { getActiveChipContext } from '../chips/chips.repository';
import * as chipsRepository from '../chips/chips.repository';
import { canPlayChip, chipPlayErrorMessage } from '../chips/chips.rules';
import { syncSquadSnapshotFromTeam } from '../scoring/scoring.service';
import * as transfersRepository from './transfers.repository';
import { calculateTransferHit, deductFreeTransfers } from './transfers.rules';
import type { ListTransfersQuery, ProcessTransfersInput } from './transfers.validation';

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

function simulateSquadAfterTransfers(
  currentSquad: SquadPlayerInput[],
  currentLineup: LineupSlot[],
  transfers: ProcessTransfersInput['transfers'],
  playersIn: Map<string, teamsRepository.PlayerWithTeam>,
): { players: SquadPlayerInput[]; lineup: LineupSlot[] } {
  const playerMap = new Map(currentSquad.map((p) => [p.playerId, p]));
  const lineupMap = new Map(currentLineup.map((l) => [l.playerId, l]));

  for (const transfer of transfers) {
    const playerIn = playersIn.get(transfer.playerInId)!;
    const outSlot = lineupMap.get(transfer.playerOutId)!;

    playerMap.delete(transfer.playerOutId);
    playerMap.set(transfer.playerInId, toSquadPlayerInput(playerIn));

    lineupMap.delete(transfer.playerOutId);
    lineupMap.set(transfer.playerInId, {
      playerId: transfer.playerInId,
      isStarter: outSlot.isStarter,
      benchOrder: outSlot.benchOrder,
      isCaptain: outSlot.isCaptain,
      isViceCaptain: outSlot.isViceCaptain,
    });
  }

  return {
    players: [...playerMap.values()],
    lineup: [...lineupMap.values()],
  };
}

export async function processTransfers(
  userId: string,
  teamId: string,
  input: ProcessTransfersInput,
) {
  await assertTeamOwner(userId, teamId);

  const gameweek = await getTransferGameweek();
  if (!gameweek) {
    throw new AppError(403, 'Transfers are closed because no future gameweek deadline is available');
  }
  await assertBeforeDeadline(gameweek);

  const team = await teamsRepository.findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const { team: teamWithSquad } = await teamsRepository.findTeamWithSquad(teamId);
  if (!teamWithSquad) {
    throw new AppError(404, 'Team not found');
  }

  const squadByPlayerId = new Map(
    teamWithSquad.squad.map((entry) => [entry.playerId, entry]),
  );
  const squadPlayerIds = new Set(squadByPlayerId.keys());

  const playerInIds = input.transfers.map((t) => t.playerInId);
  const playerOutIds = input.transfers.map((t) => t.playerOutId);
  const allPlayerIds = [...new Set([...playerInIds, ...playerOutIds])];

  const players = await teamsRepository.findPlayersByIds(allPlayerIds);
  const playerMap = new Map(players.map((p) => [p.id, p]));

  if (players.length !== allPlayerIds.length) {
    throw new AppError(400, 'One or more players were not found');
  }

  const playersInSet = new Set<string>();
  const playersOutSet = new Set<string>();

  for (const transfer of input.transfers) {
    if (transfer.playerInId === transfer.playerOutId) {
      throw new AppError(400, 'Cannot transfer a player for themselves');
    }

    if (playersInSet.has(transfer.playerInId) || playersOutSet.has(transfer.playerOutId)) {
      throw new AppError(400, 'Duplicate players in transfer batch');
    }
    playersInSet.add(transfer.playerInId);
    playersOutSet.add(transfer.playerOutId);

    if (!squadPlayerIds.has(transfer.playerOutId)) {
      throw new AppError(400, 'Player to transfer out is not in the squad');
    }

    if (squadPlayerIds.has(transfer.playerInId)) {
      throw new AppError(400, 'Player to transfer in is already in the squad');
    }

    const squadOut = squadByPlayerId.get(transfer.playerOutId)!;
    if (squadOut.isCaptain || squadOut.isViceCaptain) {
      throw new AppError(
        400,
        'Cannot transfer out captain or vice-captain. Change captaincy via PATCH /api/teams/:id/captain first',
      );
    }

    const playerIn = playerMap.get(transfer.playerInId)!;
    const playerOut = playerMap.get(transfer.playerOutId)!;

    if (playerIn.position !== playerOut.position) {
      throw new AppError(400, 'Transfer in and out players must be the same position');
    }

    if (!playerIn.isAvailable) {
      throw new AppError(400, `Player ${playerIn.name} is not available`);
    }
  }

  const currentSquad = teamWithSquad.squad.map((entry) =>
    toSquadPlayerInput(entry.player),
  );
  const currentLineup: LineupSlot[] = teamWithSquad.squad.map((entry) => ({
    playerId: entry.playerId,
    isStarter: entry.isStarter,
    benchOrder: entry.benchOrder,
    isCaptain: entry.isCaptain,
    isViceCaptain: entry.isViceCaptain,
  }));

  const playersInMap = new Map(
    playerInIds.map((id) => [id, playerMap.get(id)!]),
  );
  const simulated = simulateSquadAfterTransfers(
    currentSquad,
    currentLineup,
    input.transfers,
    playersInMap,
  );

  assertValidation(validateSquadComposition(simulated.players));
  assertValidation(validateMaxPerClub(simulated.players));
  assertValidation(validateBudget(simulated.players));

  const positions = new Map(simulated.players.map((p) => [p.playerId, p.position]));
  assertValidation(validateFormation(simulated.lineup, positions));
  assertValidation(validateCaptaincy(simulated.lineup));

  let bankBalance = team.bankBalance;
  let squadValue = team.squadValue;

  const swapInputs = input.transfers.map((transfer) => {
    const playerIn = playerMap.get(transfer.playerInId)!;
    const playerOut = playerMap.get(transfer.playerOutId)!;
    const squadOut = squadByPlayerId.get(transfer.playerOutId)!;
    const pricePaid = playerIn.price - playerOut.price;

    bankBalance -= pricePaid;
    squadValue += pricePaid;

    return {
      playerInId: transfer.playerInId,
      playerOutId: transfer.playerOutId,
      playerInPosition: playerIn.position,
      pricePaid,
      squadOutSlot: {
        isStarter: squadOut.isStarter,
        benchOrder: squadOut.benchOrder,
      },
    };
  });

  if (bankBalance < 0) {
    throw new AppError(400, 'Insufficient budget for transfer(s)');
  }

  const chipCtx = await getActiveChipContext(teamId, team.season, gameweek.number);
  let selectedChip: 'FREE_HIT' | 'WILDCARD' | null = null;
  if (input.chip) {
    selectedChip = input.chip.type;
    if (gameweek.number === 1) {
      throw new AppError(400, 'Transfer chips are not needed before the Gameweek 1 deadline');
    }
    const usages = await chipsRepository.findChipUsagesForTeam(teamId, team.season);
    const check = canPlayChip(
      input.chip.type,
      usages.map((usage) => ({
        chipType: usage.chipType,
        gameweekNumber: usage.gameweekNumber,
        wildcardNumber: usage.wildcardNumber,
      })),
      gameweek.number,
      input.chip.type === 'WILDCARD' ? input.chip.wildcardNumber : undefined,
    );
    if (!check.ok) throw new AppError(400, chipPlayErrorMessage(check.error));
  }
  const isPreGameweekOne = gameweek.number === 1 && gameweek.status === 'UPCOMING';
  const isUnlimitedTransfers = chipCtx.unlimitedTransfers || Boolean(selectedChip) || isPreGameweekOne;

  const batchHit = calculateTransferHit(
    input.transfers.length,
    team.freeTransfers,
    isUnlimitedTransfers,
  );
  const newFreeTransfers = deductFreeTransfers(
    team.freeTransfers,
    input.transfers.length,
    isUnlimitedTransfers,
  );

  await transfersRepository.executeTransfers({
    teamId,
    gameweekId: gameweek.id,
    transfers: swapInputs,
    newBankBalance: bankBalance,
    newSquadValue: squadValue,
    newFreeTransfers,
    batchHit,
    resetTransferHit: Boolean(selectedChip),
    chipUsage: input.chip
      ? {
          chipType: input.chip.type,
          gameweekNumber: gameweek.number,
          season: team.season,
          wildcardNumber: input.chip.type === 'WILDCARD' ? input.chip.wildcardNumber : undefined,
          squadBackup: input.chip.type === 'FREE_HIT'
            ? {
                squad: teamWithSquad.squad.map((entry) => ({
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
              }
            : undefined,
        }
      : undefined,
  });

  await invalidateStandingsForTeam(teamId);

  await syncSquadSnapshotFromTeam(teamId);

  const teamResponse = await buildTeamResponse(teamId);

  return {
    ...teamResponse,
    transferSummary: {
      transfersMade: input.transfers.length,
      pointsHit: batchHit,
      freeTransfersRemaining: newFreeTransfers,
    },
  };
}

export async function getTransferHistory(teamId: string, query: ListTransfersQuery) {
  const team = await teamsRepository.findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }

  const { total, rows } = await transfersRepository.findTransfersByTeam(teamId, query);
  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    data: rows.map((row) => ({
      id: row.id,
      gameweek: { number: row.gameweek.number },
      playerIn: {
        id: row.playerIn.id,
        name: row.playerIn.name,
        price: row.playerIn.price,
      },
      playerOut: {
        id: row.playerOut.id,
        name: row.playerOut.name,
        price: row.playerOut.price,
      },
      pricePaid: row.pricePaid,
      createdAt: row.createdAt,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}
