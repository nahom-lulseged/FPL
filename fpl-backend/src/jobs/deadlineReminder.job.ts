import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { broadcastDeadlineReminder } from '../modules/live/live.broadcast';

const REMINDER_KEY_PREFIX = 'deadline:reminder:';

function reminderKey(gameweekNumber: number, minutesUntil: number): string {
  return `${REMINDER_KEY_PREFIX}${gameweekNumber}:${minutesUntil}`;
}

export async function processDeadlineReminder(): Promise<void> {
  const now = Date.now();
  const upcomingGameweeks = await prisma.gameweek.findMany({
    where: { status: 'UPCOMING' },
    select: { number: true, deadline: true },
    orderBy: { number: 'asc' },
  });

  for (const gameweek of upcomingGameweeks) {
    const msUntilDeadline = gameweek.deadline.getTime() - now;
    if (msUntilDeadline <= 0) {
      continue;
    }

    const minutesUntilDeadline = Math.floor(msUntilDeadline / 60_000);

    for (const thresholdMinutes of env.DEADLINE_REMINDER_MINUTES) {
      const windowStart = thresholdMinutes - 15;
      if (
        minutesUntilDeadline > thresholdMinutes ||
        minutesUntilDeadline <= windowStart
      ) {
        continue;
      }

      const key = reminderKey(gameweek.number, thresholdMinutes);
      const alreadySent = await redis.get(key);
      if (alreadySent) {
        continue;
      }

      await broadcastDeadlineReminder({
        gameweekNumber: gameweek.number,
        deadline: gameweek.deadline.toISOString(),
        minutesUntil: thresholdMinutes,
      });

      await redis.set(key, '1', 'EX', 60 * 60 * 48);
      logger.info(
        { gameweekNumber: gameweek.number, minutesUntil: thresholdMinutes },
        'Deadline reminder sent',
      );
    }
  }
}
