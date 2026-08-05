import { prisma } from '../config/db';
import { logger } from '../lib/logger';
import { recordIngestionSync } from '../modules/ingestion/ingestion.status';
import { syncPlayers } from '../modules/ingestion/ingestion.service';
import { broadcastPlayerPriceChanged } from '../modules/live/live.broadcast';

export async function recordPriceChangesFromSnapshots(
  beforePrices: Map<string, number>,
): Promise<number> {
  const afterPlayers = await prisma.player.findMany({
    select: { id: true, price: true },
  });

  let changeCount = 0;

  for (const player of afterPlayers) {
    const oldPrice = beforePrices.get(player.id);
    if (oldPrice === undefined || oldPrice === player.price) {
      continue;
    }

    await prisma.playerPriceHistory.create({
      data: {
        playerId: player.id,
        price: player.price,
      },
    });

    await broadcastPlayerPriceChanged({
      playerId: player.id,
      oldPrice,
      newPrice: player.price,
    });
    changeCount += 1;
  }

  return changeCount;
}

export async function processPriceChangeSync(): Promise<void> {
  try {
    const beforePrices = new Map(
      (
        await prisma.player.findMany({
          select: { id: true, price: true },
        })
      ).map((player) => [player.id, player.price]),
    );

    const result = await syncPlayers();
    const changeCount = await recordPriceChangesFromSnapshots(beforePrices);

    await recordIngestionSync(true);
    logger.info({ ...result, priceChanges: changeCount }, 'Price change sync completed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Price change sync failed';
    logger.error({ err }, 'Price change sync failed');
    await recordIngestionSync(false, message);
    throw err;
  }
}
