import { AuthProvider, Role, type User } from '@prisma/client';
import { prisma } from '../../config/db';
import { supabase, supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../middleware/errorHandler';

type ApplicationUserInput = {
  supabaseAuthId: string;
  email: string | null;
  displayName: string;
  identity: {
    provider: AuthProvider;
    subject: string;
    username?: string;
    photoUrl?: string;
    providerData?: object;
  };
  additionalData?: Record<string, unknown>;
};

export type PublicUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function createApplicationUser(input: ApplicationUserInput): Promise<PublicUser> {
  const user = await prisma.user.create({
    data: {
      supabaseAuthId: input.supabaseAuthId,
      email: input.email,
      displayName: input.displayName,
      displayNameLower: input.displayName.toLowerCase(),
      ...input.additionalData,
      authIdentities: {
        create: {
          provider: input.identity.provider,
          subject: input.identity.subject,
          username: input.identity.username,
          photoUrl: input.identity.photoUrl,
          providerData: input.identity.providerData,
          lastAuthenticatedAt: new Date(),
        },
      },
    },
  } as Parameters<typeof prisma.user.create>[0]);
  return toPublicUser(user);
}

export async function refreshAccessToken(refreshToken?: string) {
  if (!refreshToken) throw new AppError(401, 'Invalid or expired refresh token');
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) throw new AppError(401, 'Invalid or expired refresh token');
  const user = await prisma.user.findUnique({ where: { supabaseAuthId: data.user.id }, select: { isSuspended: true } });
  if (!user) throw new AppError(401, 'Invalid or expired refresh token');
  if (user.isSuspended) { await supabaseAdmin.auth.admin.signOut(data.session.access_token, 'global'); throw new AppError(403, 'Account suspended'); }
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

export async function logoutUser(_userId: string, accessToken?: string): Promise<void> {
  if (accessToken) await supabaseAdmin.auth.admin.signOut(accessToken, 'global');
}

export async function createSessionForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.supabaseAuthId || user.isSuspended) throw new AppError(401, 'User not found');
  const authResult = await supabaseAdmin.auth.admin.getUserById(user.supabaseAuthId);
  if (!authResult.data.user?.email) throw new AppError(409, 'Telegram session exchange is required');
  const link = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: authResult.data.user.email });
  if (link.error) throw new AppError(502, link.error.message);
  const verified = await supabase.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' });
  if (verified.error || !verified.data.session) throw new AppError(502, 'Session exchange failed');
  return { user: toPublicUser(user), accessToken: verified.data.session.access_token, refreshToken: verified.data.session.refresh_token };
}
