import { z } from 'zod';

export const listFixturesQuerySchema = z.object({
  gameweek: z.coerce.number().int().positive().optional(),
  teamId: z.string().min(1).optional(),
  isPostponed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListFixturesQuery = z.infer<typeof listFixturesQuerySchema>;
