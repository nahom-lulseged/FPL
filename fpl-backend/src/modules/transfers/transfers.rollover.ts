import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { logger } from '../../lib/logger';
import { rolloverFreeTransfers } from './transfers.rules';

const ROLLOVER_KEY = 'transfers:rollover:gw';

export async function rolloverFreeTransfersForNewGameweek(
  newGwNumber: number,
  excludeTeamIds: string[] = [],
): Promise<number> {
  const lastRolled = await redis.get(ROLLOVER_KEY);
  if (lastRolled && parseInt(lastRolled, 10) >= newGwNumber) {
    return 0;
  }

  const excludeSet = new Set(excludeTeamIds);
  const teams = await prisma.team.findMany({
    select: { id: true, freeTransfers: true },
  });

  let updated = 0;
  for (const team of teams) {
    if (excludeSet.has(team.id)) {
      continue;
    }
    const newFree = rolloverFreeTransfers(team.freeTransfers);
    if (newFree !== team.freeTransfers) {
      await prisma.team.update({
        where: { id: team.id },
        data: { freeTransfers: newFree },
      });
      updated++;
    }
  }

  await redis.set(ROLLOVER_KEY, String(newGwNumber));
  logger.info({ newGwNumber, updated }, 'Free transfer rollover completed');
  return updated;
}
