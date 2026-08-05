import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/db';
import { CACHE_PREFIX, invalidateByPrefix } from '../../../lib/cache';
import { logger } from '../../../lib/logger';
import { buildFixtureWhere } from '../../fixtures/fixtures.repository';
import { buildPlayerWhere } from '../../players/players.repository';
import { scoreGameweek } from '../../scoring/scoring.job';
import { logAdminAction } from '../audit/auditLog.service';
import type {
  ListAdminFixturesQuery,
  ListAdminGameweeksQuery,
  ListAdminPlayersQuery,
  ListAdminRealTeamsQuery,
  UpdateFixtureBody,
  UpdateGameweekBody,
  UpdatePlayerBody,
  UpdateRealTeamBody,
} from './content.validation';

function paginatedMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export const adminPlayerSelect = {
  id: true,
  fplId: true,
  name: true,
  position: true,
  price: true,
  isAvailable: true,
  injuryNote: true,
  isManualOverride: true,
  realTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
} satisfies Prisma.PlayerSelect;

export const adminRealTeamSelect = {
  id: true,
  fplId: true,
  name: true,
  shortName: true,
  crestUrl: true,
  isManualOverride: true,
} satisfies Prisma.RealTeamSelect;

export const adminFixtureSelect = {
  id: true,
  fplId: true,
  kickoffTime: true,
  homeScore: true,
  awayScore: true,
  homeDifficulty: true,
  awayDifficulty: true,
  started: true,
  minutes: true,
  finished: true,
  isPostponed: true,
  isManualOverride: true,
  gameweek: {
    select: {
      id: true,
      number: true,
      deadline: true,
      status: true,
    },
  },
  homeTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
  awayTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
} satisfies Prisma.FixtureSelect;

export const adminGameweekSelect = {
  id: true,
  number: true,
  deadline: true,
  status: true,
  isCurrent: true,
  isManualOverride: true,
} satisfies Prisma.GameweekSelect;

export async function listPlayers(query: ListAdminPlayersQuery) {
  const where = buildPlayerWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.player.findMany({
      where,
      select: adminPlayerSelect,
      orderBy: [{ price: 'desc' }, { name: 'asc' }],
      skip,
      take: query.limit,
    }),
    prisma.player.count({ where }),
  ]);

  return { data, meta: paginatedMeta(query.page, query.limit, total) };
}

function toPlayerSnapshot(
  player: Prisma.PlayerGetPayload<{ select: typeof adminPlayerSelect }>,
): Prisma.InputJsonValue {
  return {
    id: player.id,
    name: player.name,
    price: player.price,
    isAvailable: player.isAvailable,
    injuryNote: player.injuryNote,
    isManualOverride: player.isManualOverride,
  };
}

export async function loadPlayerAuditBefore(id: string) {
  return prisma.player.findUnique({ where: { id }, select: adminPlayerSelect });
}

export async function updatePlayer(
  id: string,
  adminId: string,
  body: UpdatePlayerBody,
  beforeEntity?: Prisma.PlayerGetPayload<{ select: typeof adminPlayerSelect }>,
) {
  const existing = beforeEntity ?? (await loadPlayerAuditBefore(id));
  if (!existing) {
    return null;
  }

  const beforeJson = toPlayerSnapshot(existing);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.player.update({
      where: { id },
      data: {
        ...body,
        ...(body.name !== undefined ? { nameLower: body.name.toLowerCase() } : {}),
        isManualOverride: true,
      },
      select: adminPlayerSelect,
    });

    await logAdminAction({
      tx,
      adminId,
      action: 'PLAYER_UPDATE',
      targetType: 'Player',
      targetId: id,
      before: beforeJson,
      after: toPlayerSnapshot(updated),
    });

    return updated;
  });

  await invalidateByPrefix(CACHE_PREFIX.players);
  return result;
}

export async function getPlayerDetail(id: string) {
  const { getPlayerById } = await import('../../players/players.service');
  return getPlayerById(id);
}

export async function syncPlayerElementSummary(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    select: { id: true, fplId: true },
  });
  if (!player) {
    return null;
  }

  const { syncPlayerElementSummary: syncSummary } = await import(
    '../../ingestion/ingestion.service'
  );
  const result = await syncSummary({ playerId: player.id, fplId: player.fplId ?? undefined });
  const detail = await getPlayerDetail(id);
  return { result, player: detail };
}

function buildRealTeamWhere(query: ListAdminRealTeamsQuery): Prisma.RealTeamWhereInput {
  if (!query.search) {
    return {};
  }

  return {
    OR: [
      { nameLower: { contains: query.search.toLowerCase() } },
      { shortNameLower: { contains: query.search.toLowerCase() } },
    ],
  };
}

export async function listRealTeams(query: ListAdminRealTeamsQuery) {
  const where = buildRealTeamWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.realTeam.findMany({
      where,
      select: adminRealTeamSelect,
      orderBy: { name: 'asc' },
      skip,
      take: query.limit,
    }),
    prisma.realTeam.count({ where }),
  ]);

  return { data, meta: paginatedMeta(query.page, query.limit, total) };
}

export async function getRealTeam(id: string) {
  return prisma.realTeam.findUnique({
    where: { id },
    select: adminRealTeamSelect,
  });
}

function toRealTeamSnapshot(
  team: Prisma.RealTeamGetPayload<{ select: typeof adminRealTeamSelect }>,
): Prisma.InputJsonValue {
  return {
    id: team.id,
    shortName: team.shortName,
    crestUrl: team.crestUrl,
    isManualOverride: team.isManualOverride,
  };
}

export async function loadRealTeamAuditBefore(id: string) {
  return prisma.realTeam.findUnique({ where: { id }, select: adminRealTeamSelect });
}

export async function updateRealTeam(
  id: string,
  adminId: string,
  body: UpdateRealTeamBody,
  beforeEntity?: Prisma.RealTeamGetPayload<{ select: typeof adminRealTeamSelect }>,
) {
  const existing = beforeEntity ?? (await loadRealTeamAuditBefore(id));
  if (!existing) {
    return null;
  }

  const beforeJson = toRealTeamSnapshot(existing);

  return prisma.$transaction(async (tx) => {
    const result = await tx.realTeam.update({
      where: { id },
      data: {
        ...body,
        ...(body.shortName !== undefined
          ? { shortNameLower: body.shortName.toLowerCase() }
          : {}),
        isManualOverride: true,
      },
      select: adminRealTeamSelect,
    });

    await logAdminAction({
      tx,
      adminId,
      action: 'REAL_TEAM_UPDATE',
      targetType: 'RealTeam',
      targetId: id,
      before: beforeJson,
      after: toRealTeamSnapshot(result),
    });

    return result;
  });
}

export async function listFixtures(query: ListAdminFixturesQuery) {
  const where = buildFixtureWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.fixture.findMany({
      where,
      select: adminFixtureSelect,
      orderBy: { kickoffTime: 'asc' },
      skip,
      take: query.limit,
    }),
    prisma.fixture.count({ where }),
  ]);

  return { data, meta: paginatedMeta(query.page, query.limit, total) };
}

function toFixtureSnapshot(
  fixture: Prisma.FixtureGetPayload<{ select: typeof adminFixtureSelect }>,
): Prisma.InputJsonValue {
  return {
    id: fixture.id,
    kickoffTime: fixture.kickoffTime.toISOString(),
    isPostponed: fixture.isPostponed,
    isManualOverride: fixture.isManualOverride,
  };
}

export async function loadFixtureAuditBefore(id: string) {
  return prisma.fixture.findUnique({ where: { id }, select: adminFixtureSelect });
}

export async function updateFixture(
  id: string,
  adminId: string,
  body: UpdateFixtureBody,
  beforeEntity?: Prisma.FixtureGetPayload<{ select: typeof adminFixtureSelect }>,
) {
  const existing = beforeEntity ?? (await loadFixtureAuditBefore(id));
  if (!existing) {
    return null;
  }

  const beforeJson = toFixtureSnapshot(existing);
  const data: Prisma.FixtureUpdateInput = {
    isManualOverride: true,
  };

  if (body.kickoffTime !== undefined) {
    data.kickoffTime = new Date(body.kickoffTime);
  }
  if (body.isPostponed !== undefined) {
    data.isPostponed = body.isPostponed;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.fixture.update({
      where: { id },
      data,
      select: adminFixtureSelect,
    });

    await logAdminAction({
      tx,
      adminId,
      action: 'FIXTURE_UPDATE',
      targetType: 'Fixture',
      targetId: id,
      before: beforeJson,
      after: toFixtureSnapshot(updated),
    });

    return updated;
  });

  await invalidateByPrefix(CACHE_PREFIX.fixtures);
  return result;
}

export async function listGameweeks(query: ListAdminGameweeksQuery) {
  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.gameweek.findMany({
      select: adminGameweekSelect,
      orderBy: { number: 'asc' },
      skip,
      take: query.limit,
    }),
    prisma.gameweek.count(),
  ]);

  return { data, meta: paginatedMeta(query.page, query.limit, total) };
}

function toGameweekSnapshot(
  gameweek: Prisma.GameweekGetPayload<{ select: typeof adminGameweekSelect }>,
): Prisma.InputJsonValue {
  return {
    id: gameweek.id,
    number: gameweek.number,
    deadline: gameweek.deadline.toISOString(),
    status: gameweek.status,
    isCurrent: gameweek.isCurrent,
    isManualOverride: gameweek.isManualOverride,
  };
}

export async function loadGameweekAuditBefore(id: string) {
  return prisma.gameweek.findUnique({ where: { id }, select: adminGameweekSelect });
}

export async function updateGameweek(
  id: string,
  adminId: string,
  body: UpdateGameweekBody,
  beforeEntity?: Prisma.GameweekGetPayload<{ select: typeof adminGameweekSelect }>,
) {
  const existing = beforeEntity ?? (await loadGameweekAuditBefore(id));
  if (!existing) {
    return null;
  }

  const beforeJson = toGameweekSnapshot(existing);
  const isFinalizing =
    body.status === 'FINISHED' && existing.status !== 'FINISHED';

  const data: Prisma.GameweekUpdateInput = {
    isManualOverride: true,
  };

  if (body.deadline !== undefined) {
    data.deadline = new Date(body.deadline);
  }
  if (body.status !== undefined) {
    data.status = body.status;
  }
  if (body.isCurrent !== undefined) {
    data.isCurrent = body.isCurrent;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.isCurrent === true) {
      await tx.gameweek.updateMany({
        where: { id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const result = await tx.gameweek.update({
      where: { id },
      data,
      select: adminGameweekSelect,
    });

    await logAdminAction({
      tx,
      adminId,
      action: isFinalizing ? 'GAMEWEEK_FINALIZE' : 'GAMEWEEK_UPDATE',
      targetType: 'Gameweek',
      targetId: id,
      before: beforeJson,
      after: toGameweekSnapshot(result),
    });

    return result;
  });

  if (isFinalizing) {
    try {
      const scoreResult = await scoreGameweek(updated.number);
      logger.info(
        { ...scoreResult, gameweekNumber: updated.number },
        'Gameweek finalized and scored',
      );
    } catch (err) {
      logger.error({ err, gameweekNumber: updated.number }, 'Gameweek finalize scoring failed');
    }
  }

  return updated;
}
