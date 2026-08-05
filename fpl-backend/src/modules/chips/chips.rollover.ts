import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { logger } from '../../lib/logger';
import * as scoringRepository from '../scoring/scoring.repository';
import type { SquadBackup } from './chips.repository';
import {
  deleteTransfersForGameweek,
  findChipsForGameweekNumber,
  restoreFreeHitSquad,
  setTeamFreeTransfers,
} from './chips.repository';

const ROLLOVER_KEY = 'chips:rollover:gw';

export interface ChipRolloverResult {
  freeHitReverted: number;
  wildcardReset: number;
  excludedFromFtRollover: string[];
}

export async function processChipRolloverForNewGameweek(
  previousGwNumber: number,
  newGwNumber: number,
): Promise<ChipRolloverResult> {
  const lastRolled = await redis.get(ROLLOVER_KEY);
  if (lastRolled && parseInt(lastRolled, 10) >= newGwNumber) {
    return { freeHitReverted: 0, wildcardReset: 0, excludedFromFtRollover: [] };
  }

  const chips = await findChipsForGameweekNumber(previousGwNumber);
  const previousGameweek = await prisma.gameweek.findUnique({
    where: { number: previousGwNumber },
    select: { id: true },
  });
  const newGameweek = await prisma.gameweek.findUnique({
    where: { number: newGwNumber },
    select: { id: true },
  });

  let freeHitReverted = 0;
  let wildcardReset = 0;
  const excludedFromFtRollover: string[] = [];

  for (const chip of chips) {
    if (chip.chipType === 'FREE_HIT') {
      const backup = chip.squadBackup as SquadBackup | null;
      if (backup?.squad?.length) {
        await restoreFreeHitSquad(chip.teamId, backup);
        if (previousGameweek) {
          await deleteTransfersForGameweek(chip.teamId, previousGameweek.id);
        }
        if (newGameweek) {
          await scoringRepository.upsertSquadSnapshot(
            chip.teamId,
            newGameweek.id,
            backup.squad,
          );
        }
        freeHitReverted++;
      }
      excludedFromFtRollover.push(chip.teamId);
    } else if (chip.chipType === 'WILDCARD') {
      await setTeamFreeTransfers(chip.teamId, 1);
      wildcardReset++;
      excludedFromFtRollover.push(chip.teamId);
    }
  }

  await redis.set(ROLLOVER_KEY, String(newGwNumber));
  logger.info(
    { previousGwNumber, newGwNumber, freeHitReverted, wildcardReset },
    'Chip rollover completed',
  );

  return { freeHitReverted, wildcardReset, excludedFromFtRollover };
}
