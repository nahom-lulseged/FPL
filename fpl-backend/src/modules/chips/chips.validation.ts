import { z } from 'zod';

const chipTypeParamSchema = z.enum([
  'wildcard',
  'free-hit',
  'bench-boost',
  'triple-captain',
]);

export const chipTypeParamsSchema = z.object({
  id: z.string().min(1),
  chipType: chipTypeParamSchema,
});

export const playWildcardSchema = z.object({
  wildcardNumber: z.union([z.literal(1), z.literal(2)]),
});

export type ChipTypeParam = z.infer<typeof chipTypeParamSchema>;
export type PlayWildcardInput = z.infer<typeof playWildcardSchema>;

export const CHIP_TYPE_PARAM_TO_ENUM = {
  wildcard: 'WILDCARD',
  'free-hit': 'FREE_HIT',
  'bench-boost': 'BENCH_BOOST',
  'triple-captain': 'TRIPLE_CAPTAIN',
} as const;
