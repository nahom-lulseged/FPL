import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

const leagueTypeSchema = z.enum(['CLASSIC', 'HEAD_TO_HEAD']);

const payoutSplitRankSchema = z.object({
  place: z.number().int().positive(),
  percentBps: z.number().int().positive().max(10_000),
});

export const createLeagueSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: leagueTypeSchema,
  season: z.string().trim().min(1).max(20).default('2025/26'),
  stakeAmountMinor: z.number().int().positive().optional(),
  isPrivate: z.boolean().optional().default(false),
  payoutSplitConfig: z
    .object({
      ranks: z.array(payoutSplitRankSchema).min(1).max(10),
      platformPercentBps: z.number().int().min(0).max(10_000).optional(),
      termsVersion: z.string().optional(),
    })
    .optional(),
});

export const joinLeagueSchema = z.object({
  inviteCode: z.string().trim().min(6).max(12),
});

export const listLeaguesQuerySchema = paginationQuerySchema.extend({
  season: z.string().trim().min(1).max(20).optional(),
});

export const standingsQuerySchema = paginationQuerySchema;

export const leagueIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type JoinLeagueInput = z.infer<typeof joinLeagueSchema>;
export type ListLeaguesQuery = z.infer<typeof listLeaguesQuerySchema>;
export type StandingsQuery = z.infer<typeof standingsQuerySchema>;
