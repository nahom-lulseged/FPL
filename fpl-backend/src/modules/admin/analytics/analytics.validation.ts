import { z } from 'zod';

export const transfersQuerySchema = z.object({
  gameweek: z.coerce.number().int().positive().optional(),
});

export type TransfersQuery = z.infer<typeof transfersQuerySchema>;

export const growthQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    granularity: z.enum(['day', 'week']).default('day'),
  })
  .transform((data) => {
    const to = data.to ?? new Date();
    const from =
      data.from ??
      new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (from > to) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: '"from" must be before or equal to "to"',
          path: ['from'],
        },
      ]);
    }

    return {
      from,
      to,
      granularity: data.granularity,
    };
  });

export type GrowthQuery = z.infer<typeof growthQuerySchema>;

export const exportEntityParamSchema = z.object({
  entity: z.enum(['users', 'players', 'leagues']),
});

export type ExportEntityParam = z.infer<typeof exportEntityParamSchema>;
