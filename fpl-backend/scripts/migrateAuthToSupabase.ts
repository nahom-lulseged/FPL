import bcrypt from 'bcrypt';
import 'dotenv/config';
import dns from 'node:dns';
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

const mongoDnsServers = process.env.MONGODB_DNS_SERVERS ?? '1.1.1.1,8.8.8.8';
dns.setServers(mongoDnsServers.split(',').map((server) => server.trim()).filter(Boolean));

const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return value; };
const targetUrl = required('DATABASE_URL');
const dryRun = process.argv.includes('--dry-run');
const target = new URL(targetUrl);
if (!target.hostname.endsWith('mongodb.net')) throw new Error('Target must be MongoDB Atlas');
if (!dryRun && process.env.BACKUP_VERIFIED !== 'true') {
  throw new Error('BACKUP_VERIFIED=true is required for the real import. Run with -- --dry-run first, then set BACKUP_VERIFIED=true only after confirming you have a backup.');
}

const admin = createClient(required('SUPABASE_URL'), required('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

async function findSupabaseUserByEmail(email: string): Promise<string | undefined> {
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;

    const match = result.data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) return match.id;
    if (result.data.users.length < 1000) return undefined;
    page += 1;
  }
}

async function main() {
  const mongo = new MongoClient(targetUrl); await mongo.connect();
  try {
    const users = mongo.db().collection('User');
    for await (const user of users.find({ supabaseAuthId: { $exists: false }, email: { $type: 'string' } })) {
      if (!user.passwordHash || !(await bcrypt.getRounds(user.passwordHash))) throw new Error(`User ${user._id} has no supported bcrypt hash`);
      if (dryRun) { console.log(`[dry-run] import ${user._id} ${user.email}`); continue; }
      const email = user.email.toLowerCase();
      const existingSupabaseUserId = await findSupabaseUserByEmail(email);
      const supabaseUserId = existingSupabaseUserId ?? await (async () => {
        const created = await admin.auth.admin.createUser({ email, password_hash: user.passwordHash, email_confirm: true });
        if (created.error || !created.data.user) throw created.error ?? new Error('Supabase import failed');
        return created.data.user.id;
      })();
      await users.updateOne({ _id: user._id }, { $set: { supabaseAuthId: supabaseUserId } });
      await mongo.db().collection('AuthIdentity').updateOne(
        { provider: 'EMAIL', subject: email },
        { $setOnInsert: { userId: user._id, provider: 'EMAIL', subject: email, createdAt: new Date() }, $set: { updatedAt: new Date(), lastAuthenticatedAt: null } },
        { upsert: true },
      );
      console.log(`${existingSupabaseUserId ? 'linked' : 'imported'} ${user._id} ${email}`);
    }
  } finally { await mongo.close(); }
}
void main().catch((error) => { console.error(error); process.exit(1); });
