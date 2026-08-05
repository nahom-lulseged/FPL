import { prisma } from '../config/db';
import { logger } from '../lib/logger';
import { recordIngestionSync } from '../modules/ingestion/ingestion.status';
import { syncFixtures, syncGameweekStats } from '../modules/ingestion/ingestion.service';

const MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

export async function shouldPollLiveStats(): Promise<boolean> {
  const currentGameweek = await prisma.gameweek.findFirst({
    where: { isCurrent: true },
    select: { id: true, status: true },
  });

  if (!currentGameweek) {
    return false;
  }

  if (currentGameweek.status === 'LIVE') {
    return true;
  }

  if (currentGameweek.status === 'FINISHED') {
    const recentFixture = await prisma.fixture.findFirst({
      where: {
        gameweekId: currentGameweek.id,
        kickoffTime: { gte: new Date(Date.now() - MATCH_WINDOW_MS) },
      },
      select: { id: true },
    });
    return recentFixture !== null;
  }

  const upcomingKickoff = await prisma.fixture.findFirst({
    where: {
      gameweekId: currentGameweek.id,
      kickoffTime: { lte: new Date() },
      finished: false,
    },
    select: { id: true },
  });

  return upcomingKickoff !== null;
}

export async function processLiveStatsPoll(): Promise<void> {
  if (!(await shouldPollLiveStats())) {
    logger.debug('Skipping live stats poll — no active match window');
    return;
  }

  try {
    logger.info('Running live stats poll');
    await syncFixtures();
    await syncGameweekStats();
    await recordIngestionSync(true);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Live stats poll failed';
    logger.error({ err }, 'Live stats poll failed');
    await recordIngestionSync(false, message);
    throw err;
  }
}
