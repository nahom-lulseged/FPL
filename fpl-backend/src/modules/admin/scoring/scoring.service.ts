import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/db';
import { CACHE_PREFIX, invalidateAllStandingsWithBroadcast, invalidateByPrefix } from '../../../lib/cache';
import {
  broadcastAfterScoring,
  broadcastGameweekStatsUpdated,
} from '../../live/live.broadcast';
import { AppError } from '../../../middleware/errorHandler';
import { logAdminAction } from '../audit/auditLog.service';
import {
  applyStatCorrection,
  CORRECTABLE_STAT_TYPES,
  toPlayerStatsInput,
  type PlayerStatsInput,
} from '../../scoring/playerPoints.calculator';
import {
  computeAffectedTeamDiffs,
  computeGameweekScoreDiffs,
  persistGameweekScores,
} from '../../scoring/scoring.job';
import * as scoringRepository from '../../scoring/scoring.repository';
import type { PlayerGwInput, TeamScoreDiff } from '../../scoring/scoring.types';
import {
  consumePreview,
  PreviewTokenError,
  storePreview,
  type CorrectionPatch,
} from './scoring.preview';
import type {
  CommitCorrectionBody,
  CommitRecalculateBody,
  CorrectionPreviewBody,
  ListRecalculationHistoryQuery,
} from './scoring.validation';

function paginatedMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function summaryFromDiffs(diffs: TeamScoreDiff[]) {
  const changed = diffs.filter((d) => d.delta !== 0);
  return {
    teamsTotal: diffs.length,
    teamsChanged: changed.length,
    totalDelta: changed.reduce((sum, d) => sum + d.delta, 0),
  };
}

function handlePreviewError(err: unknown): never {
  if (err instanceof PreviewTokenError) {
    throw new AppError(409, err.message);
  }
  throw err;
}

async function afterAdminScoringCommit(
  gameweekNumber: number,
  updatedPlayerIds: string[] = [],
): Promise<void> {
  await invalidateByPrefix(CACHE_PREFIX.players);
  await invalidateAllStandingsWithBroadcast();
  await broadcastGameweekStatsUpdated(undefined, updatedPlayerIds);
  await broadcastAfterScoring(gameweekNumber);
}

export function listStatTypes() {
  return CORRECTABLE_STAT_TYPES.map((value) => ({
    value,
    inputType: value === 'cleanSheet' ? 'boolean' : 'number',
  }));
}

export async function previewRecalculate(gameweekId: string, adminId: string) {
  const gameweek = await scoringRepository.findGameweekById(gameweekId);
  if (!gameweek) {
    return null;
  }

  const result = await computeGameweekScoreDiffs(gameweek.number);
  if (!result) {
    return null;
  }

  const previewToken = await storePreview({
    type: 'FULL_RECALC',
    adminId,
    gameweekId,
    gameweekNumber: gameweek.number,
    diffs: result.diffs,
  });

  return {
    previewToken,
    diffs: result.diffs,
    summary: summaryFromDiffs(result.diffs),
    gameweek: { id: gameweek.id, number: gameweek.number },
  };
}

export async function commitRecalculate(
  gameweekId: string,
  adminId: string,
  body: CommitRecalculateBody,
) {
  const gameweek = await scoringRepository.findGameweekById(gameweekId);
  if (!gameweek) {
    return null;
  }

  let payload;
  try {
    payload = await consumePreview(body.previewToken, adminId);
  } catch (err) {
    handlePreviewError(err);
  }

  if (payload.type !== 'FULL_RECALC' || payload.gameweekId !== gameweekId) {
    throw new AppError(409, 'Preview token does not match this recalculation');
  }

  const beforeDiffs = payload.diffs;

  const scoreResult = await persistGameweekScores(gameweek.number);

  await prisma.$transaction(async (tx) => {
    await tx.recalculationLog.create({
      data: {
        gameweekId,
        triggeredBy: adminId,
        type: 'FULL_RECALC',
        teamsAffected: scoreResult.teamsScored,
        deltasJson: beforeDiffs as unknown as Prisma.InputJsonValue,
        reason: body.reason,
      },
    });

    await logAdminAction({
      tx,
      adminId,
      action: 'RECALCULATE_COMMIT',
      targetType: 'Scoring',
      targetId: gameweekId,
      before: { diffs: beforeDiffs },
      after: {
        reason: body.reason,
        previewToken: body.previewToken,
        teamsScored: scoreResult.teamsScored,
        diffs: beforeDiffs,
      },
    });
  });

  await afterAdminScoringCommit(gameweek.number);

  return {
    gameweek: { id: gameweek.id, number: gameweek.number },
    teamsScored: scoreResult.teamsScored,
    diffs: beforeDiffs,
    reason: body.reason,
  };
}

export async function previewCorrection(adminId: string, body: CorrectionPreviewBody) {
  const gameweek = await scoringRepository.findGameweekById(body.gameweekId);
  if (!gameweek) {
    return null;
  }

  const statsRow = await scoringRepository.findPlayerGameweekStats(
    body.playerId,
    body.gameweekId,
  );
  if (!statsRow) {
    throw new AppError(404, 'Player gameweek stats not found');
  }

  const beforeStats = toPlayerStatsInput(statsRow);
  const { stats: afterStats, points: newPlayerPoints } = applyStatCorrection(
    beforeStats,
    body.statType,
    body.newValue,
    statsRow.player.position,
  );

  const statsOverride = new Map<string, PlayerGwInput>();
  statsOverride.set(body.playerId, {
    playerId: body.playerId,
    position: statsRow.player.position,
    minutes: afterStats.minutes,
    points: newPlayerPoints,
  });

  const result = await computeAffectedTeamDiffs(
    gameweek.number,
    statsOverride,
    body.playerId,
  );
  if (!result) {
    return null;
  }

  const correction: CorrectionPatch = {
    playerId: body.playerId,
    gameweekId: body.gameweekId,
    statType: body.statType,
    newValue: body.newValue,
    beforeStats: beforeStats as unknown as Record<string, unknown>,
    afterStats: afterStats as unknown as Record<string, unknown>,
    oldPlayerPoints: statsRow.points,
    newPlayerPoints,
  };

  const previewToken = await storePreview({
    type: 'CORRECTION',
    adminId,
    gameweekId: body.gameweekId,
    gameweekNumber: gameweek.number,
    diffs: result.diffs,
    correction,
  });

  return {
    previewToken,
    player: {
      id: body.playerId,
      name: statsRow.player.name,
    },
    correction,
    diffs: result.diffs,
    summary: summaryFromDiffs(result.diffs),
    gameweek: { id: gameweek.id, number: gameweek.number },
  };
}

export async function commitCorrection(adminId: string, body: CommitCorrectionBody) {
  let payload;
  try {
    payload = await consumePreview(body.previewToken, adminId);
  } catch (err) {
    handlePreviewError(err);
  }

  if (payload.type !== 'CORRECTION' || !payload.correction) {
    throw new AppError(409, 'Preview token does not match this correction');
  }

  const { correction, diffs, gameweekId, gameweekNumber } = payload;
  const afterStats = correction.afterStats as unknown as PlayerStatsInput;

  const statsRow = await scoringRepository.findPlayerGameweekStats(
    correction.playerId,
    correction.gameweekId,
  );
  if (!statsRow) {
    throw new AppError(404, 'Player gameweek stats not found');
  }

  await scoringRepository.updatePlayerGameweekStats(
    correction.playerId,
    correction.gameweekId,
    {
      minutes: afterStats.minutes,
      goals: afterStats.goals,
      assists: afterStats.assists,
      cleanSheet: afterStats.cleanSheet,
      goalsConceded: afterStats.goalsConceded,
      saves: afterStats.saves,
      yellowCards: afterStats.yellowCards,
      redCards: afterStats.redCards,
      ownGoals: afterStats.ownGoals,
      penaltiesMissed: afterStats.penaltiesMissed,
      penaltiesSaved: afterStats.penaltiesSaved,
      bonus: afterStats.bonus,
      bps: afterStats.bps,
      points: correction.newPlayerPoints,
    },
  );

  const statsOverride = new Map<string, PlayerGwInput>();
  statsOverride.set(correction.playerId, {
    playerId: correction.playerId,
    position: statsRow.player.position,
    minutes: afterStats.minutes,
    points: correction.newPlayerPoints,
  });

  const teamIds = diffs.map((d) => d.teamId);
  await persistGameweekScores(gameweekNumber, {
    statsOverride,
    teamIdsFilter: teamIds,
  });

  await prisma.$transaction(async (tx) => {
    await tx.recalculationLog.create({
      data: {
        gameweekId,
        triggeredBy: adminId,
        type: 'CORRECTION',
        teamsAffected: diffs.length,
        deltasJson: diffs as unknown as Prisma.InputJsonValue,
        reason: body.reason,
      },
    });

    await logAdminAction({
      tx,
      adminId,
      action: 'CORRECTION_COMMIT',
      targetType: 'Scoring',
      targetId: correction.playerId,
      before: { correction },
      after: {
        reason: body.reason,
        previewToken: body.previewToken,
        correction,
        diffs,
      },
    });
  });

  await afterAdminScoringCommit(gameweekNumber, [correction.playerId]);

  return {
    correction,
    diffs,
    reason: body.reason,
  };
}

export async function listRecalculationHistory(query: ListRecalculationHistoryQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.recalculationLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        gameweek: { select: { id: true, number: true } },
        admin: { select: { id: true, displayName: true, email: true } },
      },
    }),
    prisma.recalculationLog.count(),
  ]);

  return {
    data: rows.map((row) => ({
      id: row.id,
      gameweekId: row.gameweekId,
      gameweekNumber: row.gameweek.number,
      type: row.type,
      teamsAffected: row.teamsAffected,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      admin: {
        id: row.admin.id,
        displayName: row.admin.displayName,
        email: row.admin.email,
      },
    })),
    meta: paginatedMeta(page, limit, total),
  };
}

export async function getRecalculationHistoryEntry(id: string) {
  const row = await prisma.recalculationLog.findUnique({
    where: { id },
    include: {
      gameweek: { select: { id: true, number: true } },
      admin: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    gameweekId: row.gameweekId,
    gameweekNumber: row.gameweek.number,
    type: row.type,
    teamsAffected: row.teamsAffected,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    admin: {
      id: row.admin.id,
      displayName: row.admin.displayName,
      email: row.admin.email,
    },
    diffs: row.deltasJson as unknown as TeamScoreDiff[],
  };
}
