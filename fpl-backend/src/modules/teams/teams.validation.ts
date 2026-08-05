import { z } from 'zod';

const lineupSlotSchema = z.object({
  playerId: z.string().min(1),
  isStarter: z.boolean(),
  benchOrder: z.number().int().min(1).max(4).nullable(),
});

const createLineupSlotSchema = lineupSlotSchema.extend({
  isCaptain: z.boolean(),
  isViceCaptain: z.boolean(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(50),
  season: z.string().trim().min(1).max(20),
  playerIds: z.array(z.string().min(1)).length(15),
  lineup: z.array(createLineupSlotSchema).length(15).optional(),
});

export const setCaptainSchema = z.object({
  captainId: z.string().min(1),
  viceCaptainId: z.string().min(1),
});

export const setLineupSchema = z.object({
  lineup: z.array(lineupSlotSchema).length(15),
  captainId: z.string().min(1).optional(),
  viceCaptainId: z.string().min(1).optional(),
  chipSelection: z.enum(['BENCH_BOOST', 'TRIPLE_CAPTAIN']).optional(),
}).refine(
  (data) =>
    (data.captainId === undefined && data.viceCaptainId === undefined) ||
    (data.captainId !== undefined && data.viceCaptainId !== undefined),
  { message: 'captainId and viceCaptainId must both be provided together' },
);

export const getTeamQuerySchema = z.object({
  gameweek: z.coerce.number().int().positive().optional(),
});

export const getMyTeamQuerySchema = z.object({
  season: z.string().trim().min(1).max(20).default('2025/26'),
});

export const teamHistoryQuerySchema = z.object({
  season: z.string().trim().min(1).max(20).optional(),
});

export const teamGameweekParamsSchema = z.object({
  id: z.string().min(1),
  gw: z.coerce.number().int().positive(),
});

export const teamIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type SetCaptainInput = z.infer<typeof setCaptainSchema>;
export type SetLineupInput = z.infer<typeof setLineupSchema>;
export type GetTeamQuery = z.infer<typeof getTeamQuerySchema>;
export type GetMyTeamQuery = z.infer<typeof getMyTeamQuerySchema>;
export type TeamHistoryQuery = z.infer<typeof teamHistoryQuerySchema>;
