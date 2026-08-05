import { prisma } from '../config/db';
import { logger } from '../lib/logger';
import { processChipRolloverForNewGameweek } from '../modules/chips/chips.rollover';
import { syncGameweekStats } from '../modules/ingestion/ingestion.service';
import { scoreGameweek } from '../modules/scoring/scoring.job';
import { rolloverFreeTransfersForNewGameweek } from '../modules/transfers/transfers.rollover';
import {
  broadcastGameweekFinalized,
  broadcastGameweekStatsUpdated,
} from '../modules/live/live.broadcast';

export async function processGameweekFinalization(
  previousGameweekNumber: number,
  newGameweekNumber: number,
): Promise<void> {
  logger.info(
    { previousGameweekNumber, newGameweekNumber },
    'Running gameweek finalization',
  );

  const result = await syncGameweekStats(previousGameweekNumber);
  await scoreGameweek(previousGameweekNumber);
  await broadcastGameweekStatsUpdated(result);

  const chipRollover = await processChipRolloverForNewGameweek(
    previousGameweekNumber,
    newGameweekNumber,
  );
  await rolloverFreeTransfersForNewGameweek(
    newGameweekNumber,
    chipRollover.excludedFromFtRollover,
  );

  const leagues = await prisma.league.findMany({ select: { id: true } });
  for (const league of leagues) {
    await prisma.league.update({
      where: { id: league.id },
      data: { updatedAt: new Date() },
    });
  }

  await broadcastGameweekFinalized(previousGameweekNumber);
  logger.info(
    { previousGameweekNumber, newGameweekNumber },
    'Gameweek finalization completed',
  );
}
