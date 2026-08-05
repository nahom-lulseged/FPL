import { z } from 'zod';

export const syncHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  syncType: z.enum(['ALL', 'TEAMS', 'PLAYERS', 'FIXTURES', 'GAMEWEEKS']).optional(),
  success: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export type SyncHistoryQuery = z.infer<typeof syncHistoryQuerySchema>;

export const syncTypeParamSchema = z.object({
  type: z.enum(['teams', 'players', 'fixtures', 'gameweeks', 'all']),
});

export type SyncTypeParam = z.infer<typeof syncTypeParamSchema>;
