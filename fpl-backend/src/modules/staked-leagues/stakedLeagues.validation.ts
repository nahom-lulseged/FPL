import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

export const listStakedLeaguesQuerySchema = paginationQuerySchema.extend({
  season: z.string().trim().min(1).max(20).optional(),
});
