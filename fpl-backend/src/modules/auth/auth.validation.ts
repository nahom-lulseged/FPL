import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
