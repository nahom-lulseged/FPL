import { Prisma, PrismaClient } from '@prisma/client';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWriteConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
}

async function retryOnWriteConflict<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isWriteConflict(err) || attempt > MAX_RETRIES) {
        throw err;
      }
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }
}

/** Child-first deletes for fantasy + reference data. Preserves users, wallets, audit logs. */
async function clearReferenceDataSteps(prisma: PrismaClient): Promise<void> {
  await prisma.recalculationLog.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.teamGameweekScore.deleteMany();
  await prisma.squadGameweekSnapshot.deleteMany();
  await prisma.chipUsage.deleteMany();
  await prisma.squad.deleteMany();
  await prisma.leagueMembership.deleteMany();
  await prisma.league.deleteMany();
  await prisma.team.deleteMany();
  await prisma.playerGameweekStats.deleteMany();
  await prisma.playerSeasonHistory.deleteMany();
  await prisma.playerPriceHistory.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.player.deleteMany();
  await prisma.gameweek.deleteMany();
  await prisma.realTeam.deleteMany();
}

export async function clearReferenceDataForSeed(prisma: PrismaClient): Promise<void> {
  await retryOnWriteConflict(() => clearReferenceDataSteps(prisma));
}

/** Reference data only (no teams/leagues/transfers). Used by phase-2 integration tests. */
export async function clearReferenceDataOnly(prisma: PrismaClient): Promise<void> {
  await retryOnWriteConflict(async () => {
    await prisma.playerGameweekStats.deleteMany();
    await prisma.playerSeasonHistory.deleteMany();
    await prisma.playerPriceHistory.deleteMany();
    await prisma.fixture.deleteMany();
    await prisma.player.deleteMany();
    await prisma.gameweek.deleteMany();
    await prisma.realTeam.deleteMany();
  });
}
