import { Role } from '@prisma/client';
import { prisma } from '../../../config/db';
import { supabase } from '../../../config/supabase';
import { AppError } from '../../../middleware/errorHandler';
import type { AdminLoginInput } from './adminAuth.validation';

async function requireAdminByAuthId(authId: string) {
  const user = await prisma.user.findUnique({ where: { supabaseAuthId: authId } });
  if (!user || user.role !== Role.ADMIN) throw new AppError(403, 'Forbidden');
  if (user.isSuspended) throw new AppError(403, 'Account suspended');
  return user;
}

export async function adminLogin(input: AdminLoginInput) {
  const result = await supabase.auth.signInWithPassword({ email: input.email.toLowerCase(), password: input.password });
  if (result.error || !result.data.session) throw new AppError(401, 'Invalid email or password');
  const user = await requireAdminByAuthId(result.data.user.id);
  return { user, accessToken: result.data.session.access_token, refreshToken: result.data.session.refresh_token };
}

export const isPartialAccessToken = () => false;
