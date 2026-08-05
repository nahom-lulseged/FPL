import { z } from 'zod';
import { listFixturesQuerySchema } from '../../fixtures/fixtures.validation';
import { listPlayersQuerySchema } from '../../players/players.validation';

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export type IdParam = z.infer<typeof idParamSchema>;

export const listAdminPlayersQuerySchema = listPlayersQuerySchema;
export type ListAdminPlayersQuery = z.infer<typeof listAdminPlayersQuerySchema>;

export const updatePlayerSchema = z
  .object({
    name: z.string().min(1).optional(),
    price: z.number().int().min(0).optional(),
    isAvailable: z.boolean().optional(),
    injuryNote: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdatePlayerBody = z.infer<typeof updatePlayerSchema>;

export const listAdminRealTeamsQuerySchema = z.object({
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListAdminRealTeamsQuery = z.infer<typeof listAdminRealTeamsQuerySchema>;

const crestUrlSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().url().nullable().optional(),
);

export const updateRealTeamSchema = z
  .object({
    shortName: z.string().min(1).optional(),
    crestUrl: crestUrlSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateRealTeamBody = z.infer<typeof updateRealTeamSchema>;

export const listAdminFixturesQuerySchema = listFixturesQuerySchema;
export type ListAdminFixturesQuery = z.infer<typeof listAdminFixturesQuerySchema>;

export const updateFixtureSchema = z
  .object({
    kickoffTime: z.string().datetime().optional(),
    isPostponed: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateFixtureBody = z.infer<typeof updateFixtureSchema>;

export const listAdminGameweeksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListAdminGameweeksQuery = z.infer<typeof listAdminGameweeksQuerySchema>;

export const updateGameweekSchema = z
  .object({
    deadline: z.string().datetime().optional(),
    status: z.enum(['UPCOMING', 'LIVE', 'FINISHED']).optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateGameweekBody = z.infer<typeof updateGameweekSchema>;

export const playerIdParamSchema = idParamSchema;
export type PlayerIdParam = IdParam;
export const updatePlayerOverrideSchema = updatePlayerSchema;
export type UpdatePlayerOverrideBody = UpdatePlayerBody;
