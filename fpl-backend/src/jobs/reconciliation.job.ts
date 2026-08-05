import { reconcileAllWallets } from '../modules/wallet/wallet.service';
import { logger } from '../lib/logger';

export async function processReconciliation(): Promise<void> {
  const result = await reconcileAllWallets();

  if (result.mismatches.length > 0) {
    logger.error({ mismatches: result.mismatches }, 'Ledger reconciliation mismatch detected');

    try {
      const { notifyLedgerMismatch } = await import('../modules/admin/system/alert.service');
      await notifyLedgerMismatch(result.mismatches);
    } catch {
      // alert service may not have this function yet
    }
  } else {
    logger.info({ total: result.total }, 'Ledger reconciliation passed');
  }
}
