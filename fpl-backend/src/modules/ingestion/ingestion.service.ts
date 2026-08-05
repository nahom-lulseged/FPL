import { prisma } from '../../config/db';
import { CACHE_PREFIX, invalidateByPrefix } from '../../lib/cache';
import { logger } from '../../lib/logger';
import {
  fetchBootstrapStatic,
  fetchElementSummary,
  fetchFixtures,
  fetchGameweekLive,
} from './fpl.client';
import { withSyncLog } from './ingestion.syncLog';
import {
  mapFplElementHistory,
  mapFplElementHistoryPast,
  mapFplElements,
  mapFplEvents,
  mapFplFixtures,
  mapFplLiveStats,
  mapFplTeams,
} from './mappers';
import type { SyncResult } from './fpl.types';
import { redis } from '../../config/redis';

const BATCH_SIZE = 50;
const ELEMENT_SUMMARY_STALE_MS = 6 * 60 * 60 * 1000;
const ELEMENT_SUMMARY_LOCK_TTL_SECONDS = 120;
const BACKFILL_DELAY_MS = 250;

function emptyResult(): SyncResult {
  return { created: 0, updated: 0, skipped: 0 };
}

function mergeResults(...results: SyncResult[]): SyncResult {
  return results.reduce(
    (acc, r) => ({
      created: acc.created + r.created,
      updated: acc.updated + r.updated,
      skipped: acc.skipped + r.skipped,
    }),
    emptyResult(),
  );
}

async function runBatched<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((item) => fn(item)));
  }
}

async function getTeamFplIdMap(): Promise<Map<number, string>> {
  const teams = await prisma.realTeam.findMany({
    where: { fplId: { not: null } },
    select: { id: true, fplId: true },
  });
  return new Map(
    teams
      .filter((t): t is { id: string; fplId: number } => t.fplId !== null)
      .map((t) => [t.fplId, t.id]),
  );
}

async function getPlayerFplIdMap(): Promise<Map<number, string>> {
  const players = await prisma.player.findMany({
    where: { fplId: { not: null } },
    select: { id: true, fplId: true },
  });
  return new Map(
    players
      .filter((p): p is { id: string; fplId: number } => p.fplId !== null)
      .map((p) => [p.fplId, p.id]),
  );
}

async function getGameweekNumberMap(): Promise<Map<number, string>> {
  const gameweeks = await prisma.gameweek.findMany({
    select: { id: true, number: true },
  });
  return new Map(gameweeks.map((gw) => [gw.number, gw.id]));
}

async function syncRealTeamsInternal(): Promise<SyncResult> {
  const bootstrap = await fetchBootstrapStatic();
  const teamData = mapFplTeams(bootstrap);

  const existingTeams = await prisma.realTeam.findMany({
    where: { fplId: { in: teamData.map((t) => t.fplId) } },
    select: { fplId: true, isManualOverride: true },
  });
  const existingTeamIds = new Set(existingTeams.map((t) => t.fplId));
  const teamOverrideByFplId = new Map(
    existingTeams
      .filter((t): t is { fplId: number; isManualOverride: boolean } => t.fplId !== null)
      .map((t) => [t.fplId, t.isManualOverride]),
  );

  const result = emptyResult();
  await runBatched(teamData, (team) => {
    const isManualOverride = teamOverrideByFplId.get(team.fplId) ?? false;

    return prisma.realTeam.upsert({
      where: { fplId: team.fplId },
      create: {
        ...team,
        nameLower: team.name.toLowerCase(),
        shortNameLower: team.shortName.toLowerCase(),
      },
      update: isManualOverride
        ? { name: team.name, nameLower: team.name.toLowerCase() }
        : {
            name: team.name,
            nameLower: team.name.toLowerCase(),
            shortName: team.shortName,
            shortNameLower: team.shortName.toLowerCase(),
            crestUrl: team.crestUrl,
          },
    });
  });
  for (const team of teamData) {
    if (existingTeamIds.has(team.fplId)) {
      result.updated++;
    } else {
      result.created++;
    }
  }

  logger.info(result, 'Teams sync completed');
  return result;
}

async function syncPlayersInternal(): Promise<SyncResult> {
  const bootstrap = await fetchBootstrapStatic();
  const playerData = mapFplElements(bootstrap);
  const teamMap = await getTeamFplIdMap();

  const existingPlayers = await prisma.player.findMany({
    where: { fplId: { in: playerData.map((p) => p.fplId) } },
    select: { fplId: true, isManualOverride: true },
  });
  const existingPlayerIds = new Set(existingPlayers.map((p) => p.fplId));
  const overrideByFplId = new Map(
    existingPlayers
      .filter((p): p is { fplId: number; isManualOverride: boolean } => p.fplId !== null)
      .map((p) => [p.fplId, p.isManualOverride]),
  );

  const validPlayers = playerData.filter((player) => {
    if (!teamMap.has(player.realTeamFplId)) {
      logger.warn(
        { playerFplId: player.fplId, teamFplId: player.realTeamFplId },
        'Skipping player: team not found',
      );
      return false;
    }
    return true;
  });

  const result = emptyResult();
  result.skipped = playerData.length - validPlayers.length;

  await runBatched(validPlayers, (player) => {
    const realTeamId = teamMap.get(player.realTeamFplId)!;
    const isManualOverride = overrideByFplId.get(player.fplId) ?? false;

    return prisma.player.upsert({
      where: { fplId: player.fplId },
      create: {
        fplId: player.fplId,
        name: player.name,
        nameLower: player.name.toLowerCase(),
        position: player.position,
        price: player.price,
        realTeamId,
        isAvailable: player.isAvailable,
        availabilityStatus: player.availabilityStatus,
        chanceOfPlayingNextRound: player.chanceOfPlayingNextRound,
        totalPoints: player.totalPoints,
        eventPoints: player.eventPoints,
        selectedByPercent: player.selectedByPercent,
        minutes: player.minutes,
        goalsScored: player.goalsScored,
        assists: player.assists,
        cleanSheets: player.cleanSheets,
        goalsConceded: player.goalsConceded,
        ownGoals: player.ownGoals,
        penaltiesSaved: player.penaltiesSaved,
      },
      update: isManualOverride
        ? {
            name: player.name,
            nameLower: player.name.toLowerCase(),
            position: player.position,
            realTeamId,
          }
        : {
            name: player.name,
            nameLower: player.name.toLowerCase(),
            position: player.position,
            price: player.price,
            realTeamId,
            isAvailable: player.isAvailable,
            availabilityStatus: player.availabilityStatus,
            chanceOfPlayingNextRound: player.chanceOfPlayingNextRound,
            totalPoints: player.totalPoints,
            eventPoints: player.eventPoints,
            selectedByPercent: player.selectedByPercent,
            minutes: player.minutes,
            goalsScored: player.goalsScored,
            assists: player.assists,
            cleanSheets: player.cleanSheets,
            goalsConceded: player.goalsConceded,
            ownGoals: player.ownGoals,
            penaltiesSaved: player.penaltiesSaved,
          },
    });
  });

  for (const player of validPlayers) {
    if (existingPlayerIds.has(player.fplId)) {
      result.updated++;
    } else {
      result.created++;
    }
  }

  logger.info(result, 'Players sync completed');
  return result;
}

async function syncGameweeksInternal(): Promise<SyncResult> {
  const bootstrap = await fetchBootstrapStatic();
  const gameweekData = mapFplEvents(bootstrap);

  const previousCurrent = await prisma.gameweek.findFirst({
    where: { isCurrent: true },
    select: { number: true },
  });

  const currentGwNumbers = gameweekData
    .filter((gw) => gw.isCurrent)
    .map((gw) => gw.number);

  if (currentGwNumbers.length > 0) {
    await prisma.gameweek.updateMany({
      where: { number: { notIn: currentGwNumbers } },
      data: { isCurrent: false },
    });
  }

  const existingGws = await prisma.gameweek.findMany({
    where: { number: { in: gameweekData.map((gw) => gw.number) } },
    select: { number: true, isManualOverride: true },
  });
  const existingGwNumbers = new Set(existingGws.map((gw) => gw.number));
  const gwOverrideByNumber = new Map(existingGws.map((gw) => [gw.number, gw.isManualOverride]));

  const result = emptyResult();
  await runBatched(gameweekData, (gw) => {
    const isManualOverride = gwOverrideByNumber.get(gw.number) ?? false;

    return prisma.gameweek.upsert({
      where: { number: gw.number },
      create: gw,
      update: isManualOverride
        ? { isManualOverride: true }
        : {
            deadline: gw.deadline,
            status: gw.status,
            isCurrent: gw.isCurrent,
          },
    });
  });
  for (const gw of gameweekData) {
    if (existingGwNumbers.has(gw.number)) {
      result.updated++;
    } else {
      result.created++;
    }
  }

  const newCurrent = await prisma.gameweek.findFirst({
    where: { isCurrent: true },
    select: { number: true },
  });

  if (
    newCurrent &&
    previousCurrent &&
    newCurrent.number > previousCurrent.number
  ) {
    const { env } = await import('../../config/env');
    if (env.ENABLE_BULLMQ) {
      const { enqueueGameweekFinalization } = await import('../../jobs/queue');
      await enqueueGameweekFinalization(previousCurrent.number, newCurrent.number);
    } else {
      const { processChipRolloverForNewGameweek } = await import(
        '../chips/chips.rollover'
      );
      const chipRollover = await processChipRolloverForNewGameweek(
        previousCurrent.number,
        newCurrent.number,
      );
      const { rolloverFreeTransfersForNewGameweek } = await import(
        '../transfers/transfers.rollover'
      );
      await rolloverFreeTransfersForNewGameweek(
        newCurrent.number,
        chipRollover.excludedFromFtRollover,
      );
    }
  }

  logger.info(result, 'Gameweeks sync completed');
  return result;
}

export async function syncBootstrap(): Promise<SyncResult> {
  const teams = await syncRealTeamsInternal();
  const players = await syncPlayersInternal();
  const gameweeks = await syncGameweeksInternal();
  const result = mergeResults(teams, players, gameweeks);
  logger.info(result, 'Bootstrap sync completed');
  return result;
}

export const syncRealTeams = () => withSyncLog('TEAMS', syncRealTeamsInternal);
export const syncPlayers = async () => {
  const result = await withSyncLog('PLAYERS', syncPlayersInternal);
  await invalidateByPrefix(CACHE_PREFIX.players);
  return result;
};
export const syncGameweeks = () => withSyncLog('GAMEWEEKS', syncGameweeksInternal);

async function syncFixturesInternal(): Promise<SyncResult> {
  const fixtures = await fetchFixtures();
  const fixtureData = mapFplFixtures(fixtures);
  const teamMap = await getTeamFplIdMap();
  const gameweekMap = await getGameweekNumberMap();
  const result = emptyResult();

  const validFixtures = fixtureData.filter((fixture) => {
    const ok =
      gameweekMap.has(fixture.gameweekNumber) &&
      teamMap.has(fixture.homeTeamFplId) &&
      teamMap.has(fixture.awayTeamFplId);
    if (!ok) {
      result.skipped++;
    }
    return ok;
  });

  const existingFixtures = await prisma.fixture.findMany({
    where: { fplId: { in: validFixtures.map((f) => f.fplId) } },
    select: { fplId: true, isManualOverride: true },
  });
  const existingFixtureIds = new Set(
    existingFixtures
      .map((f) => f.fplId)
      .filter((id): id is number => id !== null),
  );
  const fixtureOverrideByFplId = new Map(
    existingFixtures
      .filter((f): f is { fplId: number; isManualOverride: boolean } => f.fplId !== null)
      .map((f) => [f.fplId, f.isManualOverride]),
  );

  await runBatched(validFixtures, (fixture) => {
    const gameweekId = gameweekMap.get(fixture.gameweekNumber)!;
    const homeTeamId = teamMap.get(fixture.homeTeamFplId)!;
    const awayTeamId = teamMap.get(fixture.awayTeamFplId)!;
    const isManualOverride = fixtureOverrideByFplId.get(fixture.fplId) ?? false;

    const baseUpdate = {
      gameweekId,
      homeTeamId,
      awayTeamId,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      homeDifficulty: fixture.homeDifficulty,
      awayDifficulty: fixture.awayDifficulty,
      started: fixture.started,
      minutes: fixture.minutes,
      finished: fixture.finished,
    };

    return prisma.fixture.upsert({
      where: { fplId: fixture.fplId },
      create: {
        fplId: fixture.fplId,
        gameweekId,
        homeTeamId,
        awayTeamId,
        kickoffTime: fixture.kickoffTime,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        homeDifficulty: fixture.homeDifficulty,
        awayDifficulty: fixture.awayDifficulty,
        started: fixture.started,
        minutes: fixture.minutes,
        finished: fixture.finished,
      },
      update: isManualOverride
        ? baseUpdate
        : {
            ...baseUpdate,
            kickoffTime: fixture.kickoffTime,
          },
    });
  });

  for (const fixture of validFixtures) {
    if (existingFixtureIds.has(fixture.fplId)) {
      result.updated++;
    } else {
      result.created++;
    }
  }

  logger.info(result, 'Fixtures sync completed');
  return result;
}

export const syncFixtures = async () => {
  const result = await withSyncLog('FIXTURES', syncFixturesInternal);
  await invalidateByPrefix(CACHE_PREFIX.fixtures);
  return result;
};

export async function syncGameweekStats(gw?: number): Promise<SyncResult> {
  let gameweekNumber = gw;

  if (gameweekNumber === undefined) {
    const current = await prisma.gameweek.findFirst({
      where: { isCurrent: true },
      select: { number: true },
    });
    if (!current) {
      logger.warn('No current gameweek found for stats sync');
      return emptyResult();
    }
    gameweekNumber = current.number;
  }

  const gameweek = await prisma.gameweek.findUnique({
    where: { number: gameweekNumber },
    select: { id: true, number: true, status: true },
  });

  if (!gameweek) {
    logger.warn({ gameweekNumber }, 'Gameweek not found for stats sync');
    return emptyResult();
  }

  const live = await fetchGameweekLive(gameweekNumber);
  const statsData = mapFplLiveStats(live, gameweekNumber);
  const playerMap = await getPlayerFplIdMap();
  const result = emptyResult();

  const validStats = statsData.filter((stats) => {
    if (!playerMap.has(stats.playerFplId)) {
      result.skipped++;
      return false;
    }
    return true;
  });

  const existingStats = new Set(
    (
      await prisma.playerGameweekStats.findMany({
        where: {
          gameweekId: gameweek.id,
          player: { fplId: { in: validStats.map((s) => s.playerFplId) } },
        },
        select: { player: { select: { fplId: true } } },
      })
    )
      .map((s) => s.player.fplId)
      .filter((id): id is number => id !== null),
  );

  await runBatched(validStats, (stats) => {
    const playerId = playerMap.get(stats.playerFplId)!;
    const data = {
      minutes: stats.minutes,
      goals: stats.goals,
      assists: stats.assists,
      cleanSheet: stats.cleanSheet,
      goalsConceded: stats.goalsConceded,
      saves: stats.saves,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
      ownGoals: stats.ownGoals,
      penaltiesMissed: stats.penaltiesMissed,
      penaltiesSaved: stats.penaltiesSaved,
      bonus: stats.bonus,
      bps: stats.bps,
      points: stats.points,
    };

    return prisma.playerGameweekStats.upsert({
      where: {
        playerId_gameweekId: {
          playerId,
          gameweekId: gameweek.id,
        },
      },
      create: {
        playerId,
        gameweekId: gameweek.id,
        ...data,
      },
      update: data,
    });
  });

  for (const stats of validStats) {
    if (existingStats.has(stats.playerFplId)) {
      result.updated++;
    } else {
      result.created++;
    }
  }

  logger.info({ gameweekNumber, ...result }, 'Gameweek stats sync completed');

  let updatedPlayerIds: string[] = [];
  try {
    const { applyProvisionalBonusForGameweek } = await import('../scoring/bonus.service');
    updatedPlayerIds = await applyProvisionalBonusForGameweek(
      gameweek.id,
      gameweek.status,
    );
  } catch (err) {
    logger.error({ err, gameweekNumber }, 'Provisional bonus calculation failed');
  }

  try {
    const { runScoringAndBroadcast, broadcastGameweekStatsUpdated } = await import(
      '../live/live.broadcast'
    );
    await runScoringAndBroadcast(gameweekNumber);
    await broadcastGameweekStatsUpdated(result, updatedPlayerIds);
  } catch (err) {
    logger.error({ err, gameweekNumber }, 'Post-ingestion scoring failed');
  }

  await invalidateByPrefix(CACHE_PREFIX.standings);

  return result;
}

async function syncAllInternal(): Promise<SyncResult> {
  const teams = await syncRealTeamsInternal();
  await invalidateByPrefix(CACHE_PREFIX.players);

  const players = await syncPlayersInternal();
  await invalidateByPrefix(CACHE_PREFIX.players);

  const gameweeks = await syncGameweeksInternal();
  await invalidateByPrefix(CACHE_PREFIX.fixtures);

  const fixtures = await syncFixturesInternal();
  await invalidateByPrefix(CACHE_PREFIX.fixtures);

  const stats = await syncGameweekStats();
  return mergeResults(teams, players, gameweeks, fixtures, stats);
}

export async function syncAll(): Promise<SyncResult> {
  const { recordIngestionSync } = await import('./ingestion.status');

  try {
    const result = await withSyncLog('ALL', syncAllInternal);
    await recordIngestionSync(true);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown ingestion error';
    await recordIngestionSync(false, message);
    throw err;
  }
}

function elementSummaryLockKey(fplId: number): string {
  return `ingestion:element-summary:lock:${fplId}`;
}

export function isElementSummaryStale(syncedAt: Date | null | undefined, historyCount: number): boolean {
  if (historyCount === 0) {
    return true;
  }
  if (!syncedAt) {
    return true;
  }
  return Date.now() - syncedAt.getTime() > ELEMENT_SUMMARY_STALE_MS;
}

export async function syncPlayerElementSummary(params: {
  playerId?: string;
  fplId?: number;
}): Promise<SyncResult> {
  const player = await prisma.player.findFirst({
    where: params.playerId
      ? { id: params.playerId }
      : { fplId: params.fplId ?? -1 },
    select: { id: true, fplId: true },
  });

  if (!player?.fplId) {
    logger.warn({ params }, 'Player not found or missing fplId for element summary sync');
    return emptyResult();
  }

  const lockKey = elementSummaryLockKey(player.fplId);
  const acquired = await redis.set(lockKey, '1', 'EX', ELEMENT_SUMMARY_LOCK_TTL_SECONDS, 'NX');
  if (acquired !== 'OK') {
    logger.info({ fplId: player.fplId }, 'Element summary sync already in progress');
    return emptyResult();
  }

  const result = emptyResult();

  try {
    const summary = await fetchElementSummary(player.fplId);
    const gameweekMap = await getGameweekNumberMap();
    const historyRows = summary.history.map((row) => mapFplElementHistory(row, player.fplId!));
    const pastRows = summary.history_past.map(mapFplElementHistoryPast);

    const existingStats = new Set(
      (
        await prisma.playerGameweekStats.findMany({
          where: { playerId: player.id },
          select: { gameweek: { select: { number: true } } },
        })
      ).map((row) => row.gameweek.number),
    );

    await runBatched(historyRows, async (stats) => {
      const gameweekId = gameweekMap.get(stats.gameweekNumber);
      if (!gameweekId) {
        result.skipped++;
        return;
      }

      const data = {
        minutes: stats.minutes,
        goals: stats.goals,
        assists: stats.assists,
        cleanSheet: stats.cleanSheet,
        goalsConceded: stats.goalsConceded,
        saves: stats.saves,
        yellowCards: stats.yellowCards,
        redCards: stats.redCards,
        ownGoals: stats.ownGoals,
        penaltiesMissed: stats.penaltiesMissed,
        penaltiesSaved: stats.penaltiesSaved,
        bonus: stats.bonus,
        bps: stats.bps,
        points: stats.points,
        wasHome: stats.wasHome ?? null,
        opponentTeamFplId: stats.opponentTeamFplId ?? null,
        fixtureFplId: stats.fixtureFplId ?? null,
        value: stats.value ?? null,
      };

      await prisma.playerGameweekStats.upsert({
        where: {
          playerId_gameweekId: {
            playerId: player.id,
            gameweekId,
          },
        },
        create: {
          playerId: player.id,
          gameweekId,
          ...data,
        },
        update: data,
      });

      if (existingStats.has(stats.gameweekNumber)) {
        result.updated++;
      } else {
        result.created++;
        existingStats.add(stats.gameweekNumber);
      }
    });

    await runBatched(pastRows, async (past) => {
      await prisma.playerSeasonHistory.upsert({
        where: {
          playerId_seasonName: {
            playerId: player.id,
            seasonName: past.seasonName,
          },
        },
        create: {
          playerId: player.id,
          ...past,
        },
        update: past,
      });
      result.updated++;
    });

    await prisma.player.update({
      where: { id: player.id },
      data: { elementSummarySyncedAt: new Date() },
    });

    logger.info({ playerId: player.id, fplId: player.fplId, ...result }, 'Element summary sync completed');
    return result;
  } finally {
    await redis.del(lockKey).catch(() => undefined);
  }
}

export async function ensurePlayerElementSummaryFresh(playerId: string): Promise<void> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      fplId: true,
      elementSummarySyncedAt: true,
      _count: { select: { gameweekStats: true } },
    },
  });

  if (!player?.fplId) {
    return;
  }

  if (!isElementSummaryStale(player.elementSummarySyncedAt, player._count.gameweekStats)) {
    return;
  }

  try {
    await syncPlayerElementSummary({ playerId: player.id, fplId: player.fplId });
  } catch (err) {
    logger.warn(
      { err, playerId: player.id, fplId: player.fplId },
      'On-demand element summary sync failed; returning existing stats',
    );
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function backfillElementSummaries(options?: {
  limit?: number;
  delayMs?: number;
}): Promise<SyncResult> {
  const delayMs = options?.delayMs ?? BACKFILL_DELAY_MS;
  const players = await prisma.player.findMany({
    where: { fplId: { not: null } },
    select: { id: true, fplId: true, elementSummarySyncedAt: true },
    orderBy: { totalPoints: 'desc' },
    take: options?.limit,
  });

  const result = emptyResult();

  for (const player of players) {
    if (!player.fplId) {
      result.skipped++;
      continue;
    }

    try {
      const synced = await syncPlayerElementSummary({
        playerId: player.id,
        fplId: player.fplId,
      });
      result.created += synced.created;
      result.updated += synced.updated;
      result.skipped += synced.skipped;
    } catch (err) {
      result.skipped++;
      logger.warn({ err, playerId: player.id }, 'Element summary backfill item failed');
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  logger.info({ ...result, players: players.length }, 'Element summary backfill completed');
  return result;
}
