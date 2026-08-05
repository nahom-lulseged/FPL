import { z } from 'zod';

export const processTransfersSchema = z.object({
  transfers: z
    .array(
      z.object({
        playerInId: z.string().min(1),
        playerOutId: z.string().min(1),
      }),
    )
    .min(1)
    .max(15),
  chip: z.discriminatedUnion('type', [
    z.object({ type: z.literal('FREE_HIT') }),
    z.object({
      type: z.literal('WILDCARD'),
      wildcardNumber: z.union([z.literal(1), z.literal(2)]),
    }),
  ]).optional(),
});

export const listTransfersQuerySchema = z.object({
  gameweek: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ProcessTransfersInput = z.infer<typeof processTransfersSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;
