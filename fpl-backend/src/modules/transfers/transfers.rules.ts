import { MAX_FREE_TRANSFERS, TRANSFER_HIT_POINTS } from '../../lib/constants';

export function calculateTransferHit(
  transferCount: number,
  freeTransfersAvailable: number,
  isWildcardActive = false,
): number {
  if (isWildcardActive) {
    return 0;
  }
  const paidTransfers = Math.max(0, transferCount - freeTransfersAvailable);
  return paidTransfers * TRANSFER_HIT_POINTS;
}

export function deductFreeTransfers(
  current: number,
  transferCount: number,
  isWildcardActive = false,
): number {
  if (isWildcardActive) {
    return current;
  }
  return Math.max(0, current - transferCount);
}

export function rolloverFreeTransfers(current: number): number {
  return Math.min(MAX_FREE_TRANSFERS, current + 1);
}
