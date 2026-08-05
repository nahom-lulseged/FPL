import { prisma } from '../../src/config/db';
import { postBalancedEntries } from '../../src/modules/wallet/ledger.service';
import { getOrCreateUserWallet, getOrCreatePlatformWallet } from '../../src/modules/wallet/wallet.service';

describe('ledger.service', () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `ledger-test-${Date.now()}@test.com`,
        displayName: 'Ledger Test',
        displayNameLower: 'ledger test',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({
      where: { wallet: { userId } },
    });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it('posts balanced deposit entries and updates balances', async () => {
    const amount = 5000;
    const idempotencyKey = `test-deposit-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      const userWallet = await getOrCreateUserWallet(userId, tx);
      const platformWallet = await getOrCreatePlatformWallet(tx);

      await postBalancedEntries({
        tx,
        idempotencyKey,
        entries: [
          {
            walletId: userWallet.id,
            amountMinor: amount,
            direction: 'CREDIT',
            entryType: 'DEPOSIT',
            referenceType: 'Deposit',
            referenceId: 'test-dep-1',
          },
          {
            walletId: platformWallet.id,
            amountMinor: amount,
            direction: 'DEBIT',
            entryType: 'DEPOSIT',
            referenceType: 'Deposit',
            referenceId: 'test-dep-1',
          },
        ],
      });
    });

    const wallet = await getOrCreateUserWallet(userId);
    expect(wallet.balanceMinor).toBeGreaterThanOrEqual(amount);
  });

  it('no-ops on duplicate idempotency key', async () => {
    const amount = 1000;
    const idempotencyKey = `test-idempotent-${Date.now()}`;

    const run = () =>
      prisma.$transaction(async (tx) => {
        const userWallet = await getOrCreateUserWallet(userId, tx);
        const platformWallet = await getOrCreatePlatformWallet(tx);

        await postBalancedEntries({
          tx,
          idempotencyKey,
          entries: [
            {
              walletId: userWallet.id,
              amountMinor: amount,
              direction: 'CREDIT',
              entryType: 'DEPOSIT',
              referenceType: 'Deposit',
              referenceId: 'test-dep-2',
            },
            {
              walletId: platformWallet.id,
              amountMinor: amount,
              direction: 'DEBIT',
              entryType: 'DEPOSIT',
              referenceType: 'Deposit',
              referenceId: 'test-dep-2',
            },
          ],
        });
      });

    await run();
    const walletBefore = await getOrCreateUserWallet(userId);
    await run();
    const walletAfter = await getOrCreateUserWallet(userId);

    expect(walletAfter.balanceMinor).toBe(walletBefore.balanceMinor);
  });

  it('rejects unbalanced entries', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const userWallet = await getOrCreateUserWallet(userId, tx);

        await postBalancedEntries({
          tx,
          idempotencyKey: `unbalanced-${Date.now()}`,
          entries: [
            {
              walletId: userWallet.id,
              amountMinor: 100,
              direction: 'CREDIT',
              entryType: 'DEPOSIT',
              referenceType: 'Deposit',
              referenceId: 'x',
            },
          ],
        });
      }),
    ).rejects.toThrow();
  });
});
