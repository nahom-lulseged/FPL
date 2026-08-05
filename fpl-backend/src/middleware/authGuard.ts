import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { supabase } from '../config/supabase';

export const ADMIN_ACCESS_COOKIE = 'admin_access_token';
export const ACCESS_COOKIE = 'access_token';

export function resolveAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  for (const cookie of (req.headers.cookie ?? '').split(';').map((value) => value.trim())) {
    for (const name of [ACCESS_COOKIE, ADMIN_ACCESS_COOKIE]) if (cookie.startsWith(`${name}=`)) return decodeURIComponent(cookie.slice(name.length + 1));
  }
  return null;
}

export async function resolveAuthenticatedUser(token: string) {
  if (process.env.NODE_ENV === 'test' && token.startsWith('test-auth:')) {
    const [, authUserId, aal = 'aal1'] = token.split(':');
    if (!authUserId) return null;
    const user = await prisma.user.findUnique({ where: { supabaseAuthId: authUserId } });
    if (!user || user.isSuspended) return null;
    return {
      userId: user.id,
      authUserId,
      aal: aal === 'aal2' ? 'aal2' : 'aal1',
      accessToken: token,
    } as const;
  }

  const { data, error } = await supabase.auth.getClaims(token);
  const claims = data?.claims;
  const sub = claims?.sub;
  if (error || typeof sub !== 'string') return null;
  const user = await prisma.user.findUnique({ where: { supabaseAuthId: sub } });
  if (!user || user.isSuspended) return null;
  return { userId: user.id, authUserId: sub, aal: claims?.aal === 'aal2' ? 'aal2' : 'aal1', accessToken: token } as const;
}

export async function authGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = resolveAccessToken(req);
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const identity = await resolveAuthenticatedUser(token);
    if (!identity) { res.status(401).json({ error: 'Unauthorized' }); return; }
    req.user = identity;
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}
