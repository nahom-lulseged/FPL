import clsx from 'clsx';
import { calculateTransferHit, deductFreeTransfers } from '@/lib/fplRules';

interface PointsHitWarningProps {
  pendingCount: number;
  freeTransfers: number;
  isUnlimitedTransfers?: boolean;
  className?: string;
}

export function PointsHitWarning({
  pendingCount,
  freeTransfers,
  isUnlimitedTransfers = false,
  className,
}: PointsHitWarningProps) {
  const hit = calculateTransferHit(pendingCount, freeTransfers, isUnlimitedTransfers);
  const remaining = deductFreeTransfers(freeTransfers, pendingCount, isUnlimitedTransfers);

  if (isUnlimitedTransfers) {
    return (
      <div
        className={clsx(
          'rounded-lg border border-fpl-green/40 bg-fpl-green/10 px-3 py-2 text-sm text-fpl-green',
          className,
        )}
      >
        <p>
          Unlimited transfers active — no point hit
          {pendingCount > 0 ? ` · ${pendingCount} transfer${pendingCount === 1 ? '' : 's'} pending` : ''}
        </p>
      </div>
    );
  }

  if (pendingCount === 0) {
    return (
      <p className={clsx('text-sm text-white/60', className)}>
        {freeTransfers} free transfer{freeTransfers === 1 ? '' : 's'} available
      </p>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-lg border px-3 py-2 text-sm',
        hit > 0 ? 'border-fpl-pink/40 bg-fpl-pink/10 text-fpl-pink' : 'border-fpl-cyan/40 bg-fpl-cyan/10 text-fpl-cyan',
        className,
      )}
    >
      <p>
        {pendingCount} transfer{pendingCount === 1 ? '' : 's'} pending · {remaining} free remaining
        {hit > 0 ? ` · −${hit} point hit` : ' · no point hit'}
      </p>
    </div>
  );
}
