import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { formatMinor } from '@/lib/money';

interface JoinStakeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stakeAmountMinor: number;
  walletBalanceMinor: number;
  leagueName: string;
  isLoading: boolean;
}

export function JoinStakeConfirmDialog({
  open,
  onClose,
  onConfirm,
  stakeAmountMinor,
  walletBalanceMinor,
  leagueName,
  isLoading,
}: JoinStakeConfirmDialogProps) {
  const afterBalance = walletBalanceMinor - stakeAmountMinor;
  const insufficient = afterBalance < 0;

  return (
    <Modal open={open} onClose={onClose} title="Confirm stake" className="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-white/70">
          Join <span className="font-semibold text-white">{leagueName}</span> and commit your stake.
        </p>
        <dl className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/60">Stake</dt>
            <dd className="font-semibold text-fpl-gold">{formatMinor(stakeAmountMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/60">Current balance</dt>
            <dd>{formatMinor(walletBalanceMinor)}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <dt className="text-white/60">Balance after</dt>
            <dd className={insufficient ? 'text-fpl-pink' : 'text-fpl-green'}>
              {formatMinor(afterBalance)}
            </dd>
          </div>
        </dl>
        {insufficient ? (
          <p className="text-sm text-fpl-pink">Insufficient balance. Deposit funds to your wallet first.</p>
        ) : (
          <p className="text-xs text-white/50">
            This charge is immediate and non-refundable unless the league is dissolved per platform policy.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading} disabled={isLoading || insufficient}>
            Confirm & join
          </Button>
        </div>
      </div>
    </Modal>
  );
}
