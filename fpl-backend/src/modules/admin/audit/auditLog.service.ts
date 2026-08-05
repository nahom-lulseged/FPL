import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/db';
import type { LogAdminActionInput } from './auditLog.types';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function logAdminAction(
  input: LogAdminActionInput & { tx?: Prisma.TransactionClient },
): Promise<void> {
  const client = input.tx ?? prisma;

  await client.auditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      beforeJson: toJsonValue(input.before),
      ...(input.after === undefined
        ? {}
        : {
            afterJson: input.after === null ? null : toJsonValue(input.after),
          }),
    },
  });
}
