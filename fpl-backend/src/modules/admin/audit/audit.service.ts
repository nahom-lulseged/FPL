import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/db';
import type { ListAuditLogsQuery } from './audit.validation';

function buildWhere(query: ListAuditLogsQuery): Prisma.AuditLogWhereInput {
  const createdAt: Prisma.DateTimeFilter | undefined =
    query.from || query.to
      ? {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        }
      : undefined;

  return {
    ...(query.adminId ? { adminId: query.adminId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

export async function listAuditLogs(query: ListAuditLogsQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    adminId: row.adminId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    createdAt: row.createdAt.toISOString(),
    admin: {
      id: row.admin.id,
      email: row.admin.email,
      displayName: row.admin.displayName,
    },
  }));

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}
