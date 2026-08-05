import { z } from 'zod';
import { LeagueType } from '@prisma/client';

export const listLeaguesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().min(1).optional(),
  type: z.nativeEnum(LeagueType).optional(),
  sortBy: z.enum(['createdAt', 'memberCount', 'name']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ListLeaguesQuery = z.infer<typeof listLeaguesQuerySchema>;

export const leagueIdParamSchema = z.object({
  id: z.string().min(1),
});

export type LeagueIdParam = z.infer<typeof leagueIdParamSchema>;

export const leagueMemberParamsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

export type LeagueMemberParams = z.infer<typeof leagueMemberParamsSchema>;

export { confirmActionSchema, type ConfirmActionBody } from '../users/adminUsers.validation';
