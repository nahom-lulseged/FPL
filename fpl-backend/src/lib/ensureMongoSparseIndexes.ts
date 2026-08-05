import { prisma } from '../config/db';

/**
 * MongoDB unique indexes treat null as a value, unlike Postgres.
 * Enforce Wallet userId/leagueId uniqueness only when the field is present.
 */
export async function ensureMongoSparseIndexes(): Promise<void> {
  try {
    await prisma.$runCommandRaw({
      createIndexes: 'User',
      indexes: [
        { key: { email: 1 }, name: 'User_email_sparse_key', unique: true, sparse: true },
        { key: { phoneE164: 1 }, name: 'User_phoneE164_sparse_key', unique: true, sparse: true },
      ],
    });
    await prisma.$runCommandRaw({
      createIndexes: 'Wallet',
      indexes: [
        {
          key: { userId: 1 },
          name: 'Wallet_userId_sparse_key',
          unique: true,
          sparse: true,
        },
        {
          key: { leagueId: 1 },
          name: 'Wallet_leagueId_sparse_key',
          unique: true,
          sparse: true,
        },
      ],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number; codeName?: string })?.code;
    const codeName = (err as { codeName?: string })?.codeName;
    if (code === 85 || code === 86 || codeName === 'IndexOptionsConflict') {
      return;
    }
    throw err;
  }
}
