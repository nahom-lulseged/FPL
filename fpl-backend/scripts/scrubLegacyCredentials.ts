import { MongoClient } from 'mongodb';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const parsed = new URL(url);
if (!parsed.hostname.endsWith('mongodb.net')) throw new Error('Credential cleanup is restricted to MongoDB Atlas');
if (process.env.BACKUP_VERIFIED !== 'true' || process.env.MIGRATION_VALIDATED !== 'true') throw new Error('BACKUP_VERIFIED=true and MIGRATION_VALIDATED=true are required');
if (process.env.CONFIRM_SCRUB !== parsed.pathname.slice(1)) throw new Error('CONFIRM_SCRUB must exactly equal the target database name');
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const client = new MongoClient(url!); await client.connect();
  try {
    const users = client.db().collection('User');
    const filter = { $or: [
      { passwordHash: { $exists: true } }, { passwordResetTokenHash: { $exists: true } },
      { passwordResetExpiresAt: { $exists: true } }, { totpSecret: { $exists: true } }, { twoFactorEnabled: { $exists: true } },
    ] };
    const count = await users.countDocuments(filter);
    console.log(`${dryRun ? '[dry-run] ' : ''}${count} user records contain legacy credential fields`);
    if (!dryRun) await users.updateMany(filter, { $unset: { passwordHash: '', passwordResetTokenHash: '', passwordResetExpiresAt: '', totpSecret: '', twoFactorEnabled: '' } });
  } finally { await client.close(); }
}
void main().catch((error) => { console.error(error); process.exit(1); });
