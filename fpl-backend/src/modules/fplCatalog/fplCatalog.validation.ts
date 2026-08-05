import { z } from 'zod';

export const fplPlayersQuerySchema = z.object({
  team: z.coerce.number().int().min(1).max(20).optional(),
  position: z.coerce.number().int().min(1).max(4).optional(),
  search: z.string().trim().max(80).optional(),
  sortBy: z.enum(['total_points', 'event_points', 'form', 'selected_by_percent', 'now_cost']).default('total_points'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const fplFixturesQuerySchema = z.object({
  gameweek: z.coerce.number().int().min(1).max(38).optional(),
  team: z.coerce.number().int().min(1).max(20).optional(),
});

export const fplPlayerParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type FplPlayersQuery = z.infer<typeof fplPlayersQuerySchema>;
export type FplFixturesQuery = z.infer<typeof fplFixturesQuerySchema>;
