import type { GameweekStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import type { SyncResult } from '../ingestion/fpl.types';
import { scoreGameweek } from '../scoring/scoring.job';
import * as scoringRepository from '../scoring/scoring.repository';
import {
  getLiveScoresGateway,
  type DeadlineReminderPayload,
  type GwFinalizedPayload,
  type PlayerPriceChangedPayload,
} from '../../sockets/liveScores.gateway';

function mapPointsStatus(status: GameweekStatus): 'provisional' | 'confirmed' {
  return status === 'LIVE' ? 'provisional' : 'confirmed';
}

async function getCurrentGameweekNumber(): Promise<number | null> {
  const gameweek = await prisma.gameweek.findFirst({
    where: { isCurrent: true },
    select: { number: true },
  });
  return gameweek?.number ?? null;
}

export async function broadcastGameweekStatsUpdated(
  _result?: SyncResult,
  updatedPlayerIds: string[] = [],
): Promise<void> {
  if (!env.ENABLE_SOCKET_IO) {
    return;
  }

  const gateway = getLiveScoresGateway();
  if (!gateway) {
    return;
  }

  const gameweekNumber = await getCurrentGameweekNumber();
  if (!gameweekNumber) {
    return;
  }

  gateway.emitGwStatsUpdated({ gameweekNumber, updatedPlayerIds });
}

async function broadcastTeamScoresForGameweek(gameweekNumber: number): Promise<void> {
  const gateway = getLiveScoresGateway();
  if (!gateway) {
    return;
  }

  const gameweek = await scoringRepository.findGameweekByNumber(gameweekNumber);
  if (!gameweek) {
    return;
  }

  const teamIds = await scoringRepository.findTeamIdsWithSnapshot(gameweek.id);
  const pointsStatus = mapPointsStatus(gameweek.status);

  for (const teamId of teamIds) {
    const stored = await scoringRepository.findTeamGameweekScore(teamId, gameweek.id);
    if (!stored) {
      continue;
    }

    gateway.emitTeamScoreUpdated({
      teamId,
      gameweekNumber,
      totalPoints: stored.totalPoints,
      pointsStatus,
    });
  }
}

export async function broadcastAfterScoring(gameweekNumber: number): Promise<void> {
  await broadcastTeamScoresForGameweek(gameweekNumber);
}

export async function broadcastPlayerPriceChanged(
  payload: PlayerPriceChangedPayload,
): Promise<void> {
  if (!env.ENABLE_SOCKET_IO) {
    return;
  }

  getLiveScoresGateway()?.emitPlayerPriceChanged(payload);
}

export async function broadcastDeadlineReminder(
  payload: DeadlineReminderPayload,
): Promise<void> {
  if (!env.ENABLE_SOCKET_IO) {
    return;
  }

  getLiveScoresGateway()?.emitDeadlineReminder(payload);
}

export async function broadcastGameweekFinalized(gameweekNumber: number): Promise<void> {
  if (!env.ENABLE_SOCKET_IO) {
    return;
  }

  const payload: GwFinalizedPayload = { gameweekNumber };
  getLiveScoresGateway()?.emitGwFinalized(payload);
}

export async function runScoringAndBroadcast(gameweekNumber: number): Promise<void> {
  await scoreGameweek(gameweekNumber);
  await broadcastAfterScoring(gameweekNumber);
}
