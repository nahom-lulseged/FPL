import { z } from 'zod';

export const PLAYER_SORT_FIELDS = [
  'totalPoints',
  'eventPoints',
  'price',
  'selectedByPercent',
  'minutes',
  'goalsScored',
  'assists',
  'cleanSheets',
  'goalsConceded',
  'ownGoals',
  'penaltiesSaved',
] as const;

export type PlayerSortField = (typeof PLAYER_SORT_FIELDS)[number];

const MAX_PLAYER_IDS = 100;

/** Parse comma-separated player IDs; empty segments dropped; capped at MAX_PLAYER_IDS. */
export function parsePlayerIdsParam(raw: string | undefined): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .slice(0, MAX_PLAYER_IDS);
  return ids.length > 0 ? ids : undefined;
}

export const listPlayersQuerySchema = z
  .object({
    position: z.enum(['GK', 'DEF', 'MID', 'FWD']).optional(),
    teamId: z.string().min(1).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    search: z.string().min(1).optional(),
    ids: z.string().optional(),
    sortBy: z.enum(PLAYER_SORT_FIELDS).optional().default('totalPoints'),
    sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  })
  .transform((query) => ({
    ...query,
    ids: parsePlayerIdsParam(query.ids),
  }));

export type ListPlayersQuery = z.infer<typeof listPlayersQuerySchema>;

export const playerIdParamSchema = z.object({
  id: z.string().min(1),
});
