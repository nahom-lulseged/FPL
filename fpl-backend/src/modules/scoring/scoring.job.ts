import cron from 'node-cron';
import { env } from '../../config/env';
import { invalidateAllStandingsWithBroadcast } from '../../lib/cache';
import { logger } from '../../lib/logger';
import { findChipsForGameweekForTeams, toActiveChipContext } from '../chips/chips.repository';
import { findCurrentGameweek } from '../teams/teams.repository';
import { broadcastAfterScoring } from '../live/live.broadcast';
import { scoreTeamGameweek } from './scoring.engine';
import * as scoringRepository from './scoring.repository';
import type {
  GameweekComputeResult,
  PlayerGwInput,
  TeamGameweekResult,
  TeamScoreDiff,
} from './scoring.types';

function effectivePlayerPoints(stats: {
  points: number;
  bonus: number;
  provisionalBonus: number | null;
}): number {
  if (stats.bonus > 0) {
    return stats.points;
  }
  return stats.points + (stats.provisionalBonus ?? 0);
}

export interface ScoreJobResult {
  gameweekNumber: number;
  teamsScored: number;
  skipped: number;
}

function buildStatsMap(
  stats: Awaited<ReturnType<typeof scoringRepository.findPlayerStatsForGameweek>>,
): Map<string, PlayerGwInput> {
  return new Map(
    stats.map((s) => [
      s.playerId,
      {
        playerId: s.playerId,
        position: s.player.position,
        minutes: s.minutes,
        points: effectivePlayerPoints(s),
      },
    ]),
  );
}

interface GameweekScoringContext {
  gameweek: NonNullable<Awaited<ReturnType<typeof scoringRepository.findGameweekByNumber>>>;
  statsByPlayerId: Map<string, PlayerGwInput>;
  snapshotsByTeamId: Map<string, import('./scoring.types').SnapshotSlot[]>;
  transferHitByTeamId: Map<string, number>;
  existingPointsByTeamId: Map<string, number>;
  chipByTeamId: Map<string, Awaited<ReturnType<typeof findChipsForGameweekForTeams>>[number]>;
  seasonByTeamId: Map<string, string>;
  teamIds: string[];
}

async function loadGameweekScoringContext(
  gameweekNumber: number,
  options?: {
    statsOverride?: Map<string, PlayerGwInput>;
    teamIdsFilter?: string[];
  },
): Promise<GameweekScoringContext | null> {
  const gameweek = await scoringRepository.findGameweekByNumber(gameweekNumber);
  if (!gameweek) {
    return null;
  }

  const statsByPlayerId = buildStatsMap(
    await scoringRepository.findPlayerStatsForGameweek(gameweek.id),
  );

  if (options?.statsOverride) {
    for (const [playerId, override] of options.statsOverride) {
      statsByPlayerId.set(playerId, override);
    }
  }

  let teamIds = await scoringRepository.findTeamIdsWithSnapshot(gameweek.id);
  if (options?.teamIdsFilter) {
    const filterSet = new Set(options.teamIdsFilter);
    teamIds = teamIds.filter((id) => filterSet.has(id));
  }

  const [snapshotRows, existingScores, teamSeasons] = await Promise.all([
    scoringRepository.findSnapshotsForGameweek(gameweek.id),
    scoringRepository.findTeamGameweekScoresForTeams(teamIds, gameweek.id),
    scoringRepository.findTeamSeasonsForTeams(teamIds),
  ]);

  const snapshotsByTeamId = scoringRepository.groupSnapshotsByTeam(snapshotRows);
  const transferHitByTeamId = new Map(
    existingScores.map((score) => [score.teamId, score.transferHit]),
  );
  const existingPointsByTeamId = new Map(
    existingScores.map((score) => [score.teamId, score.totalPoints]),
  );
  const seasonByTeamId = new Map(teamSeasons.map((team) => [team.id, team.season]));

  const seasons = [...new Set(teamSeasons.map((team) => team.season))];
  const chipRowsBySeason = await Promise.all(
    seasons.map(async (season) => ({
      season,
      rows: await findChipsForGameweekForTeams(
        teamIds.filter((teamId) => seasonByTeamId.get(teamId) === season),
        season,
        gameweek.number,
      ),
    })),
  );
  const chipByTeamId = new Map(
    chipRowsBySeason.flatMap(({ rows }) =>
      rows.map((chip) => [chip.teamId!, chip] as const),
    ),
  );

  return {
    gameweek,
    statsByPlayerId,
    snapshotsByTeamId,
    transferHitByTeamId,
    existingPointsByTeamId,
    chipByTeamId,
    seasonByTeamId,
    teamIds,
  };
}

function computeTeamResult(
  ctx: GameweekScoringContext,
  teamId: string,
): TeamGameweekResult | null {
  const snapshot = ctx.snapshotsByTeamId.get(teamId);
  if (!snapshot || snapshot.length === 0) {
    return null;
  }

  const transferHit = ctx.transferHitByTeamId.get(teamId) ?? 0;
  const season = ctx.seasonByTeamId.get(teamId);
  const chipCtx = toActiveChipContext(
    season ? ctx.chipByTeamId.get(teamId) : undefined,
  );

  return scoreTeamGameweek(snapshot, ctx.statsByPlayerId, transferHit, {
    benchBoost: chipCtx.benchBoost,
    tripleCaptain: chipCtx.tripleCaptain,
  });
}

async function buildTeamScoreDiffs(
  ctx: GameweekScoringContext,
): Promise<{ diffs: TeamScoreDiff[]; teamsScored: number; skipped: number }> {
  const teams = await scoringRepository.findTeamsByIds(ctx.teamIds);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const diffs: TeamScoreDiff[] = [];
  let teamsScored = 0;
  let skipped = 0;

  for (const teamId of ctx.teamIds) {
    const result = computeTeamResult(ctx, teamId);
    if (!result) {
      skipped++;
      continue;
    }

    const oldPoints = ctx.existingPointsByTeamId.get(teamId) ?? 0;
    const newPoints = result.totalPoints;

    diffs.push({
      teamId,
      teamName: teamNameById.get(teamId) ?? teamId,
      oldPoints,
      newPoints,
      delta: newPoints - oldPoints,
    });
    teamsScored++;
  }

  return { diffs, teamsScored, skipped };
}

export async function computeGameweekScoreDiffs(
  gameweekNumber: number,
): Promise<GameweekComputeResult | null> {
  const ctx = await loadGameweekScoringContext(gameweekNumber);
  if (!ctx) {
    return null;
  }

  const { diffs, teamsScored, skipped } = await buildTeamScoreDiffs(ctx);

  return {
    gameweekId: ctx.gameweek.id,
    gameweekNumber: ctx.gameweek.number,
    diffs,
    teamsScored,
    skipped,
  };
}

export async function computeAffectedTeamDiffs(
  gameweekNumber: number,
  statsOverride: Map<string, PlayerGwInput>,
  playerId: string,
): Promise<GameweekComputeResult | null> {
  const gameweek = await scoringRepository.findGameweekByNumber(gameweekNumber);
  if (!gameweek) {
    return null;
  }

  const teamIdsFilter = await scoringRepository.findTeamIdsWithPlayerInSnapshot(
    gameweek.id,
    playerId,
  );

  const ctx = await loadGameweekScoringContext(gameweekNumber, {
    statsOverride,
    teamIdsFilter,
  });
  if (!ctx) {
    return null;
  }

  const { diffs, teamsScored, skipped } = await buildTeamScoreDiffs(ctx);

  return {
    gameweekId: ctx.gameweek.id,
    gameweekNumber: ctx.gameweek.number,
    diffs,
    teamsScored,
    skipped,
  };
}

export async function persistGameweekScores(
  gameweekNumber: number,
  options?: {
    statsOverride?: Map<string, PlayerGwInput>;
    teamIdsFilter?: string[];
  },
): Promise<ScoreJobResult> {
  const ctx = await loadGameweekScoringContext(gameweekNumber, options);
  if (!ctx) {
    logger.warn({ gameweekNumber }, 'Gameweek not found for scoring');
    return { gameweekNumber, teamsScored: 0, skipped: 0 };
  }

  let teamsScored = 0;
  let skipped = 0;

  for (const teamId of ctx.teamIds) {
    const result = computeTeamResult(ctx, teamId);
    if (!result) {
      skipped++;
      continue;
    }

    await scoringRepository.upsertTeamGameweekScore(
      teamId,
      ctx.gameweek.id,
      result,
    );
    await scoringRepository.recomputeTeamTotalPoints(teamId);
    teamsScored++;
  }

  return { gameweekNumber, teamsScored, skipped };
}

export async function scoreGameweek(gameweekNumber: number): Promise<ScoreJobResult> {
  const result = await persistGameweekScores(gameweekNumber);

  logger.info(
    {
      gameweekNumber,
      teamsScored: result.teamsScored,
      skipped: result.skipped,
    },
    'Gameweek scoring completed',
  );

  if (env.ENABLE_SOCKET_IO) {
    try {
      await broadcastAfterScoring(gameweekNumber);
    } catch (err) {
      logger.error({ err, gameweekNumber }, 'Failed to broadcast team scores');
    }
  }

  await invalidateAllStandingsWithBroadcast();

  return result;
}

export async function scoreAllCurrentGameweeks(): Promise<void> {
  const gameweek = await findCurrentGameweek();
  if (!gameweek || gameweek.status === 'UPCOMING') {
    return;
  }
  await scoreGameweek(gameweek.number);
}

export function startScoringCron(): () => void {
  const task = cron.schedule(env.SCORING_CRON_SCHEDULE, async () => {
    try {
      await scoreAllCurrentGameweeks();
    } catch (err) {
      logger.error({ err }, 'Scheduled scoring job failed');
    }
  });

  logger.info({ schedule: env.SCORING_CRON_SCHEDULE }, 'Scoring cron job started');

  return () => {
    task.stop();
    logger.info('Scoring cron job stopped');
  };
}
