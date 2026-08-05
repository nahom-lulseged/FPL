import { GameweekStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { logger } from '../../lib/logger';
import {
  calculateProvisionalBonusForGameweek,
  type BonusCandidate,
} from './bonus.calculator';

export async function applyProvisionalBonusForGameweek(
  gameweekId: string,
  status: GameweekStatus,
): Promise<string[]> {
  if (status !== 'LIVE') {
    await prisma.playerGameweekStats.updateMany({
      where: { gameweekId },
      data: { provisionalBonus: null },
    });
    return [];
  }

  const fixtures = await prisma.fixture.findMany({
    where: { gameweekId },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });

  const stats = await prisma.playerGameweekStats.findMany({
    where: { gameweekId },
    select: {
      playerId: true,
      bonus: true,
      bps: true,
      player: { select: { realTeamId: true } },
    },
  });

  const candidates: BonusCandidate[] = stats.map((row) => ({
    playerId: row.playerId,
    realTeamId: row.player.realTeamId,
    bps: row.bps,
    bonus: row.bonus,
  }));

  const provisionalByPlayer = calculateProvisionalBonusForGameweek(fixtures, candidates);
  const updatedPlayerIds: string[] = [];

  await prisma.$transaction(
    stats.map((row) => {
      const provisionalBonus = provisionalByPlayer.get(row.playerId) ?? null;
      if (provisionalBonus !== null) {
        updatedPlayerIds.push(row.playerId);
      }
      return prisma.playerGameweekStats.update({
        where: {
          playerId_gameweekId: {
            playerId: row.playerId,
            gameweekId,
          },
        },
        data: { provisionalBonus },
      });
    }),
  );

  logger.info(
    { gameweekId, updatedCount: updatedPlayerIds.length },
    'Provisional bonus applied',
  );

  return updatedPlayerIds;
}
