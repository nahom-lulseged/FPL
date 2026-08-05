import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import type { SnapshotSlot, TeamGameweekResult } from './scoring.types';

export async function upsertSquadSnapshot(
  teamId: string,
  gameweekId: string,
  slots: SnapshotSlot[],
) {
  await prisma.$transaction([
    prisma.squadGameweekSnapshot.deleteMany({
      where: { teamId, gameweekId },
    }),
    prisma.squadGameweekSnapshot.createMany({
      data: slots.map((slot) => ({
        teamId,
        gameweekId,
        playerId: slot.playerId,
        position: slot.position,
        isStarter: slot.isStarter,
        benchOrder: slot.benchOrder,
        isCaptain: slot.isCaptain,
        isViceCaptain: slot.isViceCaptain,
      })),
    }),
  ]);
}

export async function findSnapshotForTeam(teamId: string, gameweekId: string) {
  return prisma.squadGameweekSnapshot.findMany({
    where: { teamId, gameweekId },
    orderBy: [{ isStarter: 'desc' }, { benchOrder: 'asc' }],
  });
}

export async function findSnapshotsForGameweek(gameweekId: string) {
  return prisma.squadGameweekSnapshot.findMany({
    where: { gameweekId },
  });
}

export async function findTeamIdsWithSnapshot(gameweekId: string): Promise<string[]> {
  const rows = await prisma.squadGameweekSnapshot.findMany({
    where: { gameweekId },
    select: { teamId: true },
    distinct: ['teamId'],
  });
  return rows.map((r) => r.teamId);
}

export async function upsertTeamGameweekScore(
  teamId: string,
  gameweekId: string,
  result: TeamGameweekResult,
) {
  const data = {
    startersPoints: result.startersPoints,
    captainBonus: result.captainBonus,
    benchPoints: result.benchPoints,
    transferHit: result.transferHit,
    totalPoints: result.totalPoints,
    breakdown: result.players as unknown as Prisma.InputJsonValue,
  };

  return prisma.teamGameweekScore.upsert({
    where: {
      teamId_gameweekId: { teamId, gameweekId },
    },
    create: {
      teamId,
      gameweekId,
      ...data,
    },
    update: data,
  });
}

export async function findTeamGameweekScore(teamId: string, gameweekId: string) {
  return prisma.teamGameweekScore.findUnique({
    where: {
      teamId_gameweekId: { teamId, gameweekId },
    },
  });
}

export async function recomputeTeamTotalPoints(teamId: string) {
  const aggregate = await prisma.teamGameweekScore.aggregate({
    where: { teamId },
    _sum: { totalPoints: true },
  });

  const totalPoints = aggregate._sum.totalPoints ?? 0;

  await prisma.team.update({
    where: { id: teamId },
    data: { totalPoints },
  });

  return totalPoints;
}

export async function findAllTeamIds() {
  const teams = await prisma.team.findMany({ select: { id: true } });
  return teams.map((t) => t.id);
}

export async function findGameweekByNumber(number: number) {
  return prisma.gameweek.findUnique({
    where: { number },
    select: {
      id: true,
      number: true,
      status: true,
      deadline: true,
      isCurrent: true,
    },
  });
}

export async function findGameweekById(id: string) {
  return prisma.gameweek.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
    },
  });
}

export async function findTeamSeason(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: { season: true },
  });
}

export async function findPlayerStatsForGameweek(gameweekId: string) {
  return prisma.playerGameweekStats.findMany({
    where: { gameweekId },
    select: {
      playerId: true,
      minutes: true,
      points: true,
      bonus: true,
      provisionalBonus: true,
      player: { select: { position: true } },
    },
  });
}

export async function findPlayerEventStatsForGameweek(
  gameweekId: string,
  playerIds: string[],
) {
  if (playerIds.length === 0) {
    return [];
  }

  return prisma.playerGameweekStats.findMany({
    where: {
      gameweekId,
      playerId: { in: playerIds },
    },
    select: {
      playerId: true,
      minutes: true,
      goals: true,
      assists: true,
      cleanSheet: true,
      goalsConceded: true,
      saves: true,
      yellowCards: true,
      redCards: true,
      ownGoals: true,
      penaltiesMissed: true,
      penaltiesSaved: true,
      bonus: true,
      bps: true,
      points: true,
      provisionalBonus: true,
    },
  });
}

export async function findTeamGameweekScoresForTeams(
  teamIds: string[],
  gameweekId: string,
) {
  if (teamIds.length === 0) {
    return [];
  }

  return prisma.teamGameweekScore.findMany({
    where: {
      teamId: { in: teamIds },
      gameweekId,
    },
    select: {
      teamId: true,
      transferHit: true,
      totalPoints: true,
    },
  });
}

export async function findTeamsByIds(teamIds: string[]) {
  if (teamIds.length === 0) {
    return [];
  }

  return prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
  });
}

export async function findTeamIdsWithPlayerInSnapshot(
  gameweekId: string,
  playerId: string,
): Promise<string[]> {
  const rows = await prisma.squadGameweekSnapshot.findMany({
    where: { gameweekId, playerId },
    select: { teamId: true },
    distinct: ['teamId'],
  });
  return rows.map((r) => r.teamId);
}

export async function findPlayerGameweekStats(
  playerId: string,
  gameweekId: string,
) {
  return prisma.playerGameweekStats.findUnique({
    where: {
      playerId_gameweekId: { playerId, gameweekId },
    },
    include: {
      player: { select: { position: true, name: true } },
    },
  });
}

export async function updatePlayerGameweekStats(
  playerId: string,
  gameweekId: string,
  data: {
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
    points: number;
  },
) {
  return prisma.playerGameweekStats.update({
    where: {
      playerId_gameweekId: { playerId, gameweekId },
    },
    data,
  });
}

export async function findTeamSeasonsForTeams(teamIds: string[]) {
  if (teamIds.length === 0) {
    return [];
  }

  return prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, season: true },
  });
}

export function groupSnapshotsByTeam(
  rows: Awaited<ReturnType<typeof findSnapshotsForGameweek>>,
): Map<string, SnapshotSlot[]> {
  const grouped = new Map<string, SnapshotSlot[]>();

  for (const row of rows) {
    const slots = grouped.get(row.teamId) ?? [];
    slots.push({
      playerId: row.playerId,
      position: row.position,
      isStarter: row.isStarter,
      benchOrder: row.benchOrder,
      isCaptain: row.isCaptain,
      isViceCaptain: row.isViceCaptain,
    });
    grouped.set(row.teamId, slots);
  }

  return grouped;
}

export function toSnapshotSlots(
  rows: Awaited<ReturnType<typeof findSnapshotForTeam>>,
): SnapshotSlot[] {
  return rows.map((row) => ({
    playerId: row.playerId,
    position: row.position,
    isStarter: row.isStarter,
    benchOrder: row.benchOrder,
    isCaptain: row.isCaptain,
    isViceCaptain: row.isViceCaptain,
  }));
}
