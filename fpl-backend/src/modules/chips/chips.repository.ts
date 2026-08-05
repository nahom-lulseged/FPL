import type { ChipType, Position, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { isUnlimitedTransferChip } from './chips.rules';

export interface SquadBackupSlot {
  playerId: string;
  position: Position;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface SquadBackup {
  squad: SquadBackupSlot[];
  bankBalance: number;
  squadValue: number;
  freeTransfers: number;
}

export interface ChipUsageRow {
  id: string;
  teamId?: string;
  chipType: ChipType;
  gameweekNumber: number;
  season: string;
  wildcardNumber: number | null;
  squadBackup: unknown;
  usedAt: Date;
}

export interface ActiveChipContext {
  chipType: ChipType | null;
  benchBoost: boolean;
  tripleCaptain: boolean;
  unlimitedTransfers: boolean;
}

export async function findChipUsagesForTeam(
  teamId: string,
  season: string,
): Promise<ChipUsageRow[]> {
  return prisma.chipUsage.findMany({
    where: { teamId, season },
    orderBy: { usedAt: 'asc' },
    select: {
      id: true,
      chipType: true,
      gameweekNumber: true,
      season: true,
      wildcardNumber: true,
      squadBackup: true,
      usedAt: true,
    },
  });
}

export async function findChipForGameweek(
  teamId: string,
  season: string,
  gameweekNumber: number,
): Promise<ChipUsageRow | null> {
  return prisma.chipUsage.findFirst({
    where: { teamId, season, gameweekNumber },
    select: {
      id: true,
      chipType: true,
      gameweekNumber: true,
      season: true,
      wildcardNumber: true,
      squadBackup: true,
      usedAt: true,
    },
  });
}

export async function findChipsForGameweekForTeams(
  teamIds: string[],
  season: string,
  gameweekNumber: number,
): Promise<ChipUsageRow[]> {
  if (teamIds.length === 0) {
    return [];
  }

  return prisma.chipUsage.findMany({
    where: {
      teamId: { in: teamIds },
      season,
      gameweekNumber,
    },
    select: {
      id: true,
      teamId: true,
      chipType: true,
      gameweekNumber: true,
      season: true,
      wildcardNumber: true,
      squadBackup: true,
      usedAt: true,
    },
  });
}

export function toActiveChipContext(chip: ChipUsageRow | undefined): ActiveChipContext {
  if (!chip) {
    return {
      chipType: null,
      benchBoost: false,
      tripleCaptain: false,
      unlimitedTransfers: false,
    };
  }

  return {
    chipType: chip.chipType,
    benchBoost: chip.chipType === 'BENCH_BOOST',
    tripleCaptain: chip.chipType === 'TRIPLE_CAPTAIN',
    unlimitedTransfers: isUnlimitedTransferChip(chip.chipType),
  };
}

export async function getActiveChipContext(
  teamId: string,
  season: string,
  gwNumber: number,
): Promise<ActiveChipContext> {
  const chip = await findChipForGameweek(teamId, season, gwNumber);
  return toActiveChipContext(chip ?? undefined);
}

export async function hasUnlimitedTransfers(
  teamId: string,
  season: string,
  gameweekNumber: number,
): Promise<boolean> {
  const ctx = await getActiveChipContext(teamId, season, gameweekNumber);
  return ctx.unlimitedTransfers;
}

interface CreateChipUsageParams {
  teamId: string;
  chipType: ChipType;
  gameweekNumber: number;
  season: string;
  wildcardNumber?: number;
  squadBackup?: SquadBackup;
}

export async function createChipUsage(params: CreateChipUsageParams) {
  return prisma.chipUsage.create({
    data: {
      teamId: params.teamId,
      chipType: params.chipType,
      gameweekNumber: params.gameweekNumber,
      season: params.season,
      wildcardNumber: params.wildcardNumber ?? null,
      squadBackup: params.squadBackup
        ? (params.squadBackup as unknown as Prisma.InputJsonValue)
        : undefined,
    },
    select: {
      id: true,
      chipType: true,
      gameweekNumber: true,
      wildcardNumber: true,
      usedAt: true,
    },
  });
}

export async function deleteChipUsage(
  teamId: string,
  season: string,
  gameweekNumber: number,
  chipType: 'BENCH_BOOST' | 'TRIPLE_CAPTAIN',
): Promise<boolean> {
  const result = await prisma.chipUsage.deleteMany({
    where: { teamId, season, gameweekNumber, chipType },
  });
  return result.count > 0;
}

export async function resetTransferHitForGameweek(
  teamId: string,
  gameweekId: string,
): Promise<void> {
  const existing = await prisma.teamGameweekScore.findUnique({
    where: {
      teamId_gameweekId: { teamId, gameweekId },
    },
  });

  if (!existing || existing.transferHit === 0) {
    return;
  }

  const totalPoints =
    existing.startersPoints + existing.captainBonus + existing.benchPoints;

  await prisma.teamGameweekScore.update({
    where: {
      teamId_gameweekId: { teamId, gameweekId },
    },
    data: {
      transferHit: 0,
      totalPoints,
    },
  });
}

export async function restoreFreeHitSquad(
  teamId: string,
  backup: SquadBackup,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.squad.deleteMany({ where: { teamId } });

    await tx.squad.createMany({
      data: backup.squad.map((slot) => ({
        teamId,
        playerId: slot.playerId,
        position: slot.position,
        isStarter: slot.isStarter,
        benchOrder: slot.benchOrder,
        isCaptain: slot.isCaptain,
        isViceCaptain: slot.isViceCaptain,
      })),
    });

    await tx.team.update({
      where: { id: teamId },
      data: {
        bankBalance: backup.bankBalance,
        squadValue: backup.squadValue,
        freeTransfers: backup.freeTransfers,
      },
    });
  });
}

export async function deleteTransfersForGameweek(
  teamId: string,
  gameweekId: string,
): Promise<void> {
  await prisma.transfer.deleteMany({
    where: { teamId, gameweekId },
  });
}

export async function findChipsForGameweekNumber(
  gameweekNumber: number,
): Promise<
  Array<{
    teamId: string;
    chipType: ChipType;
    squadBackup: unknown;
  }>
> {
  return prisma.chipUsage.findMany({
    where: { gameweekNumber },
    select: {
      teamId: true,
      chipType: true,
      squadBackup: true,
    },
  });
}

export async function setTeamFreeTransfers(
  teamId: string,
  freeTransfers: number,
): Promise<void> {
  await prisma.team.update({
    where: { id: teamId },
    data: { freeTransfers },
  });
}
