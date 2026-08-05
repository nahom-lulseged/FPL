import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().min(1).optional(),
  registeredFrom: z.coerce.date().optional(),
  registeredTo: z.coerce.date().optional(),
  isAdmin: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  hasTeam: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sortBy: z
    .enum(['createdAt', 'email', 'displayName', 'teamCount'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;

export const suspendUserSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});

export type SuspendUserBody = z.infer<typeof suspendUserSchema>;

export const confirmActionSchema = z.object({
  confirm: z.literal(true),
});

export type ConfirmActionBody = z.infer<typeof confirmActionSchema>;
