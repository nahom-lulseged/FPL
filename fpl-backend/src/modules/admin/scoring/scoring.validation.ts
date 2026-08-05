import { z } from 'zod';
import { CORRECTABLE_STAT_TYPES } from '../../scoring/playerPoints.calculator';

export const gameweekIdParamSchema = z.object({
  gameweekId: z.string().min(1),
});

export const recalculationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const commitRecalculateSchema = z.object({
  previewToken: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const correctionPreviewSchema = z.object({
  playerId: z.string().min(1),
  gameweekId: z.string().min(1),
  statType: z.enum(CORRECTABLE_STAT_TYPES),
  newValue: z.union([z.number().int().min(0), z.boolean()]),
});

export const commitCorrectionSchema = z.object({
  previewToken: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const listRecalculationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GameweekIdParam = z.infer<typeof gameweekIdParamSchema>;
export type RecalculationIdParam = z.infer<typeof recalculationIdParamSchema>;
export type CommitRecalculateBody = z.infer<typeof commitRecalculateSchema>;
export type CorrectionPreviewBody = z.infer<typeof correctionPreviewSchema>;
export type CommitCorrectionBody = z.infer<typeof commitCorrectionSchema>;
export type ListRecalculationHistoryQuery = z.infer<
  typeof listRecalculationHistoryQuerySchema
>;
