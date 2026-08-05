import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../../config/db';
import { redis } from '../../../config/redis';
import { supabaseAdmin } from '../../../config/supabase';
import { AppError } from '../../../middleware/errorHandler';
import { logAdminAction } from '../audit/auditLog.service';
import type {
  ConfirmActionBody,
  ListUsersQuery,
  SuspendUserBody,
} from './adminUsers.validation';

const REFRESH_TOKEN_KEY_PREFIX = 'refresh:';

const userAuditSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isSuspended: true,
  suspendedAt: true,
  suspendedReason: true,
  createdAt: true,
  supabaseAuthId: true,
} as const;

function refreshTokenKey(userId: string): string {
  return `${REFRESH_TOKEN_KEY_PREFIX}${userId}`;
}

async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(refreshTokenKey(userId));
}

function toUserSnapshot(user: {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  isSuspended: boolean;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isAdmin: user.role === Role.ADMIN,
    isSuspended: user.isSuspended,
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    suspendedReason: user.suspendedReason,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function loadUserAuditBefore(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userAuditSelect,
  });
}

function buildListWhere(query: ListUsersQuery): Prisma.UserWhereInput {
  const createdAt: Prisma.DateTimeFilter | undefined =
    query.registeredFrom || query.registeredTo
      ? {
          ...(query.registeredFrom ? { gte: query.registeredFrom } : {}),
          ...(query.registeredTo ? { lte: query.registeredTo } : {}),
        }
      : undefined;

  return {
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search.toLowerCase() } },
            { displayNameLower: { contains: query.search.toLowerCase() } },
          ],
        }
      : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(query.isAdmin !== undefined
      ? { role: query.isAdmin ? Role.ADMIN : Role.USER }
      : {}),
    ...(query.hasTeam !== undefined
      ? query.hasTeam
        ? { teams: { some: {} } }
        : { teams: { none: {} } }
      : {}),
  };
}

function buildListOrderBy(
  query: ListUsersQuery,
): Prisma.UserOrderByWithRelationInput {
  if (query.sortBy === 'teamCount') {
    return { teams: { _count: query.sortDir } };
  }

  return { [query.sortBy]: query.sortDir };
}

export async function listUsers(query: ListUsersQuery) {
  const where = buildListWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isSuspended: true,
        suspendedAt: true,
        createdAt: true,
        _count: {
          select: {
            teams: true,
            leagueMemberships: true,
          },
        },
      },
      orderBy: buildListOrderBy(query),
      skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isAdmin: row.role === Role.ADMIN,
    isSuspended: row.isSuspended,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    teamCount: row._count.teams,
    leagueMembershipCount: row._count.leagueMemberships,
  }));

  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isSuspended: true,
      suspendedAt: true,
      suspendedReason: true,
      createdAt: true,
      updatedAt: true,
      teams: {
        select: {
          id: true,
          name: true,
          season: true,
          totalPoints: true,
          bankBalance: true,
          squadValue: true,
          _count: {
            select: { transfers: true },
          },
          squad: {
            select: {
              position: true,
              isStarter: true,
              isCaptain: true,
              isViceCaptain: true,
              benchOrder: true,
              player: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  price: true,
                },
              },
            },
            orderBy: [{ isStarter: 'desc' }, { benchOrder: 'asc' }],
          },
        },
      },
      leagueMemberships: {
        select: {
          id: true,
          joinedAt: true,
          league: {
            select: {
              id: true,
              name: true,
              type: true,
              season: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      },
    },
  });

  if (!user) {
    return null;
  }

  const transferCount = user.teams.reduce(
    (sum, team) => sum + team._count.transfers,
    0,
  );

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.role === Role.ADMIN,
    isSuspended: user.isSuspended,
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    suspendedReason: user.suspendedReason,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    transferCount,
    teams: user.teams.map((team) => ({
      id: team.id,
      name: team.name,
      season: team.season,
      totalPoints: team.totalPoints,
      bankBalance: team.bankBalance,
      squadValue: team.squadValue,
      transferCount: team._count.transfers,
      squad: team.squad.map((entry) => ({
        position: entry.position,
        isStarter: entry.isStarter,
        isCaptain: entry.isCaptain,
        isViceCaptain: entry.isViceCaptain,
        benchOrder: entry.benchOrder,
        player: entry.player,
      })),
    })),
    leagueMemberships: user.leagueMemberships.map((membership) => ({
      id: membership.id,
      joinedAt: membership.joinedAt.toISOString(),
      league: membership.league,
    })),
  };
}

export async function suspendUser(
  userId: string,
  adminId: string,
  body: SuspendUserBody,
  beforeSnapshot?: Awaited<ReturnType<typeof loadUserAuditBefore>>,
) {
  const user = beforeSnapshot ?? (await loadUserAuditBefore(userId));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const beforeJson = toUserSnapshot(user);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: body.suspended
        ? {
            isSuspended: true,
            suspendedAt: new Date(),
            suspendedReason: body.reason ?? null,
          }
        : {
            isSuspended: false,
            suspendedAt: null,
            suspendedReason: null,
          },
    });

    await logAdminAction({
      tx,
      adminId,
      action: body.suspended ? 'USER_SUSPEND' : 'USER_UNSUSPEND',
      targetType: 'User',
      targetId: userId,
      before: beforeJson,
      after: toUserSnapshot(result),
    });

    return result;
  });

  if (body.suspended) {
    await revokeRefreshToken(userId);
  }

  return toUserSnapshot(updated);
}

export async function promoteUser(
  userId: string,
  adminId: string,
  body: ConfirmActionBody,
  beforeSnapshot?: Awaited<ReturnType<typeof loadUserAuditBefore>>,
) {
  if (!body.confirm) {
    throw new AppError(400, 'Confirmation required');
  }

  const user = beforeSnapshot ?? (await loadUserAuditBefore(userId));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (userId === adminId) {
    throw new AppError(409, 'Cannot change your own admin role');
  }

  const beforeJson = toUserSnapshot(user);
  const newRole = user.role === Role.ADMIN ? Role.USER : Role.ADMIN;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await logAdminAction({
      tx,
      adminId,
      action: newRole === Role.ADMIN ? 'USER_PROMOTE' : 'USER_DEMOTE',
      targetType: 'User',
      targetId: userId,
      before: beforeJson,
      after: toUserSnapshot(result),
    });

    return result;
  });

  return toUserSnapshot(updated);
}

export async function resetUserPassword(
  userId: string,
  adminId: string,
  beforeSnapshot?: Awaited<ReturnType<typeof loadUserAuditBefore>>,
) {
  const user = beforeSnapshot ?? (await loadUserAuditBefore(userId));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (!user.email) throw new AppError(409, 'Telegram-only users must link an email before password recovery');
  const result = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: user.email });
  if (result.error) throw new AppError(502, result.error.message);
  await logAdminAction({ adminId, action: 'USER_RESET_PASSWORD', targetType: 'User', targetId: userId, before: toUserSnapshot(user), after: { recoveryRequested: true } });
  return { message: 'Password recovery link generated', actionLink: result.data.properties.action_link };
}

export async function deleteUser(
  userId: string,
  adminId: string,
  body: ConfirmActionBody,
  beforeSnapshot?: Awaited<ReturnType<typeof loadUserAuditBefore>>,
) {
  if (!body.confirm) {
    throw new AppError(400, 'Confirmation required');
  }

  if (userId === adminId) {
    throw new AppError(409, 'Cannot delete your own account');
  }

  const user = beforeSnapshot ?? (await loadUserAuditBefore(userId));

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const beforeJson = toUserSnapshot(user);

  await prisma.$transaction(async (tx) => {
    await tx.league.deleteMany({ where: { adminUserId: userId } });
    await tx.user.delete({ where: { id: userId } });

    await logAdminAction({
      tx,
      adminId,
      action: 'USER_DELETE',
      targetType: 'User',
      targetId: userId,
      before: beforeJson,
      after: null,
    });
  });

  await revokeRefreshToken(userId);

  return { message: 'User deleted' };
}
