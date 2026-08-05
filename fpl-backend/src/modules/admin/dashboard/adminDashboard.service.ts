import { prisma } from '../../../config/db';
import { checkDbLatency, checkRedisLatency } from '../../../lib/healthChecks';
import { getLastIngestionSync } from '../../ingestion/ingestion.status';

export interface DashboardSummary {
  totalUsers: number;
  totalTeams: number;
  activeLeagues: number;
  currentGameweek: {
    id: string;
    number: number;
    deadline: string;
    status: string;
    isCurrent: boolean;
  } | null;
  nextGameweek: {
    id: string;
    number: number;
    deadline: string;
    status: string;
    isCurrent: boolean;
  } | null;
  lastIngestionSync: {
    timestamp: string | null;
    success: boolean | null;
  };
  dbConnectionOk: boolean;
  redisConnectionOk: boolean;
}

async function checkDbConnection(): Promise<boolean> {
  const result = await checkDbLatency();
  return result.ok;
}

async function checkRedisConnection(): Promise<boolean> {
  const result = await checkRedisLatency();
  return result.ok;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    totalUsers,
    totalTeams,
    activeLeagues,
    currentGameweek,
    nextGameweek,
    lastIngestionSync,
    dbConnectionOk,
    redisConnectionOk,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.league.count(),
    prisma.gameweek.findFirst({
      where: { isCurrent: true },
      select: { id: true, number: true, deadline: true, status: true, isCurrent: true },
    }),
    prisma.gameweek.findFirst({
      where: {
        status: 'UPCOMING',
        deadline: { gt: new Date() },
      },
      orderBy: { deadline: 'asc' },
      select: { id: true, number: true, deadline: true, status: true, isCurrent: true },
    }),
    getLastIngestionSync(),
    checkDbConnection(),
    checkRedisConnection(),
  ]);

  return {
    totalUsers,
    totalTeams,
    activeLeagues,
    currentGameweek: currentGameweek
      ? {
          id: currentGameweek.id,
          number: currentGameweek.number,
          deadline: currentGameweek.deadline.toISOString(),
          status: currentGameweek.status,
          isCurrent: currentGameweek.isCurrent,
        }
      : null,
    nextGameweek: nextGameweek
      ? {
          id: nextGameweek.id,
          number: nextGameweek.number,
          deadline: nextGameweek.deadline.toISOString(),
          status: nextGameweek.status,
          isCurrent: nextGameweek.isCurrent,
        }
      : null,
    lastIngestionSync: {
      timestamp: lastIngestionSync?.timestamp ?? null,
      success: lastIngestionSync?.success ?? null,
    },
    dbConnectionOk,
    redisConnectionOk,
  };
}
