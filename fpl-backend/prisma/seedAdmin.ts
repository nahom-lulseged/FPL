import { PrismaClient, Role } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const DEV_ADMIN_EMAIL = 'admin@dev.local';
export const DEV_ADMIN_PASSWORD = 'password123';
export const DEV_ADMIN_NAME = 'Admin Dev';
export const shouldSeedDevAdmin = () => process.env.NODE_ENV !== 'production' && process.env.SEED_DEV_ADMIN !== 'false';

export async function upsertDevAdminUser(prisma: PrismaClient): Promise<void> {
  if (!shouldSeedDevAdmin()) return;
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials are required to seed an admin');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const created = await supabase.auth.admin.createUser({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD, email_confirm: true });
  if (created.error && !created.error.message.toLowerCase().includes('already')) throw created.error;
  let authId = created.data.user?.id;
  if (!authId) {
    const listed = await supabase.auth.admin.listUsers();
    authId = listed.data.users.find((user) => user.email === DEV_ADMIN_EMAIL)?.id;
  }
  if (!authId) throw new Error('Could not resolve seeded Supabase admin');
  const existing = await prisma.user.findFirst({ where: { email: DEV_ADMIN_EMAIL } });
  const data = { supabaseAuthId: authId, email: DEV_ADMIN_EMAIL, displayName: DEV_ADMIN_NAME, displayNameLower: DEV_ADMIN_NAME.toLowerCase(), role: Role.ADMIN };
  if (existing) await prisma.user.update({ where: { id: existing.id }, data }); else await prisma.user.create({ data });
}
