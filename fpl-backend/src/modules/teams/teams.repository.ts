import { Prisma, type ChipType, type Position } from '@prisma/client';
import { prisma } from '../../config/db';
import { BUDGET_TENTHS } from '../../lib/constants';
import type { LineupSlot } from './teams.types';

export const playerSelect = {
  id: true,
  name: true,
  position: true,
  price: true,
  isAvailable: true,
  availabilityStatus: true,
  chanceOfPlayingNextRound: true,
  realTeamId: true,
  realTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
} as const;

export type PlayerWithTeam = Prisma.PlayerGetPayload<{ select: typeof playerSelect }>;

export async function findPlayersByIds(ids: string[]): Promise<PlayerWithTeam[]> {
  return prisma.player.findMany({
    where: { id: { in: ids } },
    select: playerSelect,
  });
}

export async function findTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      name: true,
      season: true,
      bankBalance: true,
      squadValue: true,
      totalPoints: true,
      freeTransfers: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function findTeamByUserAndSeason(userId: string, season: string) {
  return prisma.team.findUnique({
    where: { userId_season: { userId, season } },
    select: { id: true, name: true, season: true },
  });
}

export async function findGameweekByNumber(number: number) {
  return prisma.gameweek.findUnique({
    where: { number },
    select: {
      id: true,
      number: true,
      deadline: true,
      status: true,
      isCurrent: true,
    },
  });
}

export async function findCurrentGameweek() {
  return prisma.gameweek.findFirst({
    where: { isCurrent: true },
    select: {
      id: true,
      number: true,
      deadline: true,
      status: true,
      isCurrent: true,
    },
  });
}

export async function findTeamWithSquad(teamId: string, gameweekId?: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      squad: {
        include: {
          player: {
            select: playerSelect,
          },
        },
        orderBy: [{ isStarter: 'desc' }, { benchOrder: 'asc' }, { position: 'asc' }],
      },
    },
  });

  if (!team || !gameweekId) {
    return { team, statsByPlayerId: new Map<string, number>() };
  }

  const playerIds = team.squad.map((s) => s.playerId);
  const stats = await prisma.playerGameweekStats.findMany({
    where: {
      gameweekId,
      playerId: { in: playerIds },
    },
    select: {
      playerId: true,
      points: true,
    },
  });

  const statsByPlayerId = new Map(stats.map((s) => [s.playerId, s.points]));
  return { team, statsByPlayerId };
}

interface SquadCreateRow {
  playerId: string;
  position: Position;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

interface TeamCreateData {
  userId: string;
  name: string;
  season: string;
  bankBalance: number;
  squadValue: number;
}

export async function createTeamWithSquad(
  teamData: TeamCreateData,
  squadRows: SquadCreateRow[],
) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        userId: teamData.userId,
        name: teamData.name,
        season: teamData.season,
        bankBalance: teamData.bankBalance,
        squadValue: teamData.squadValue,
      },
    });

    await tx.squad.createMany({
      data: squadRows.map((row) => ({
        teamId: team.id,
        ...row,
      })),
    });

    return team;
  });
}

export async function replaceLineup(
  teamId: string,
  updates: LineupSlot[],
) {
  return prisma.$transaction(
    updates.map((slot) =>
      prisma.squad.update({
        where: {
          teamId_playerId: {
            teamId,
            playerId: slot.playerId,
          },
        },
        data: {
          isStarter: slot.isStarter,
          benchOrder: slot.benchOrder,
          isCaptain: slot.isCaptain,
          isViceCaptain: slot.isViceCaptain,
        },
      }),
    ),
  );
}

export async function replaceLineupAndPlayChip(
  teamId: string,
  updates: LineupSlot[],
  chip: { chipType: ChipType; gameweekNumber: number; season: string },
) {
  return prisma.$transaction(async (tx) => {
    for (const slot of updates) {
      await tx.squad.update({
        where: { teamId_playerId: { teamId, playerId: slot.playerId } },
        data: {
          isStarter: slot.isStarter,
          benchOrder: slot.benchOrder,
          isCaptain: slot.isCaptain,
          isViceCaptain: slot.isViceCaptain,
        },
      });
    }

    await tx.chipUsage.create({
      data: {
        teamId,
        chipType: chip.chipType,
        gameweekNumber: chip.gameweekNumber,
        season: chip.season,
      },
    });
  });
}

export async function updateCaptaincy(
  teamId: string,
  captainId: string,
  viceCaptainId: string,
) {
  return prisma.$transaction([
    prisma.squad.updateMany({
      where: { teamId },
      data: { isCaptain: false, isViceCaptain: false },
    }),
    prisma.squad.update({
      where: { teamId_playerId: { teamId, playerId: captainId } },
      data: { isCaptain: true },
    }),
    prisma.squad.update({
      where: { teamId_playerId: { teamId, playerId: viceCaptainId } },
      data: { isViceCaptain: true },
    }),
  ]);
}

export { BUDGET_TENTHS };
