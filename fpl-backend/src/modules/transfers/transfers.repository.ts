import type { ChipType, Position, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';

export interface TransferSwapInput {
  playerInId: string;
  playerOutId: string;
  playerInPosition: Position;
  pricePaid: number;
  squadOutSlot: {
    isStarter: boolean;
    benchOrder: number | null;
  };
}

export interface ExecuteTransfersParams {
  teamId: string;
  gameweekId: string;
  transfers: TransferSwapInput[];
  newBankBalance: number;
  newSquadValue: number;
  newFreeTransfers: number;
  batchHit: number;
  resetTransferHit?: boolean;
  chipUsage?: {
    chipType: ChipType;
    gameweekNumber: number;
    season: string;
    wildcardNumber?: number;
    squadBackup?: unknown;
  };
}

export async function executeTransfers(params: ExecuteTransfersParams): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (params.chipUsage) {
      await tx.chipUsage.create({
        data: {
          teamId: params.teamId,
          chipType: params.chipUsage.chipType,
          gameweekNumber: params.chipUsage.gameweekNumber,
          season: params.chipUsage.season,
          wildcardNumber: params.chipUsage.wildcardNumber ?? null,
          squadBackup: params.chipUsage.squadBackup as Prisma.InputJsonValue | undefined,
        },
      });
    }
    for (const transfer of params.transfers) {
      await tx.squad.delete({
        where: {
          teamId_playerId: {
            teamId: params.teamId,
            playerId: transfer.playerOutId,
          },
        },
      });

      await tx.squad.create({
        data: {
          teamId: params.teamId,
          playerId: transfer.playerInId,
          position: transfer.playerInPosition,
          isStarter: transfer.squadOutSlot.isStarter,
          benchOrder: transfer.squadOutSlot.benchOrder,
          isCaptain: false,
          isViceCaptain: false,
        },
      });

      await tx.transfer.create({
        data: {
          teamId: params.teamId,
          playerInId: transfer.playerInId,
          playerOutId: transfer.playerOutId,
          gameweekId: params.gameweekId,
          pricePaid: transfer.pricePaid,
        },
      });
    }

    await tx.team.update({
      where: { id: params.teamId },
      data: {
        bankBalance: params.newBankBalance,
        squadValue: params.newSquadValue,
        freeTransfers: params.newFreeTransfers,
      },
    });

    const existing = await tx.teamGameweekScore.findUnique({
      where: {
        teamId_gameweekId: {
          teamId: params.teamId,
          gameweekId: params.gameweekId,
        },
      },
    });

    const transferHit = (params.resetTransferHit ? 0 : (existing?.transferHit ?? 0)) + params.batchHit;
    const startersPoints = existing?.startersPoints ?? 0;
    const captainBonus = existing?.captainBonus ?? 0;
    const benchPoints = existing?.benchPoints ?? 0;
    const totalPoints = startersPoints + captainBonus + benchPoints - transferHit;

    await tx.teamGameweekScore.upsert({
      where: {
        teamId_gameweekId: {
          teamId: params.teamId,
          gameweekId: params.gameweekId,
        },
      },
      create: {
        teamId: params.teamId,
        gameweekId: params.gameweekId,
        startersPoints: 0,
        captainBonus: 0,
        benchPoints: 0,
        transferHit,
        totalPoints,
      },
      update: {
        transferHit,
        totalPoints,
      },
    });
  });
}

export interface ListTransfersQuery {
  gameweek?: number;
  page: number;
  limit: number;
}

export async function findTransfersByTeam(teamId: string, query: ListTransfersQuery) {
  let gameweekId: string | undefined;

  if (query.gameweek !== undefined) {
    const gameweek = await prisma.gameweek.findUnique({
      where: { number: query.gameweek },
      select: { id: true },
    });

    if (!gameweek) {
      return { total: 0, rows: [] };
    }

    gameweekId = gameweek.id;
  }

  const where = {
    teamId,
    ...(gameweekId !== undefined ? { gameweekId } : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [total, rows] = await prisma.$transaction([
    prisma.transfer.count({ where }),
    prisma.transfer.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        gameweek: { select: { number: true } },
        playerIn: { select: { id: true, name: true, price: true } },
        playerOut: { select: { id: true, name: true, price: true } },
      },
    }),
  ]);

  return { total, rows };
}

export async function countTransfersInGameweek(
  teamId: string,
  gameweekId: string,
): Promise<number> {
  return prisma.transfer.count({
    where: { teamId, gameweekId },
  });
}
