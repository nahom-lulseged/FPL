import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { PointsHitWarning } from '@/components/transfers/PointsHitWarning';
import { TransferSummary } from '@/components/transfers/TransferSummary';
import type { PendingTransfer } from '@/types/transfer';
import type { TransferChipSelection } from '@/types/transfer';
import type { ChipStatus } from '@/types/chip';

interface TransferConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transfers: PendingTransfer[];
  freeTransfers: number;
  isUnlimitedTransfers?: boolean;
  isLoading: boolean;
  gameweekNumber?: number;
  chipStatus?: ChipStatus;
  selectedChip: TransferChipSelection | null;
  onChipChange: (chip: TransferChipSelection | null) => void;
}

export function TransferConfirmModal({
  open,
  onClose,
  onConfirm,
  transfers,
  freeTransfers,
  isUnlimitedTransfers = false,
  isLoading,
  gameweekNumber,
  chipStatus,
  selectedChip,
  onChipChange,
}: TransferConfirmModalProps) {
  const allowTransferChips = Boolean(gameweekNumber && gameweekNumber > 1);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm transfers"
      className="max-w-lg"
      closeOnBackdrop={!isLoading}
    >
      <div className="space-y-4">
        <TransferSummary transfers={transfers} onRemove={() => {}} />
        <PointsHitWarning
          pendingCount={transfers.length}
          freeTransfers={freeTransfers}
          isUnlimitedTransfers={isUnlimitedTransfers || Boolean(selectedChip)}
        />
        {allowTransferChips ? (
          <fieldset className="transfer-chip-choices">
            <legend>Transfer chip</legend>
            <button type="button" className={!selectedChip ? 'is-active' : undefined} onClick={() => onChipChange(null)}>
              No chip
            </button>
            <button
              type="button"
              disabled={!chipStatus?.availability.FREE_HIT}
              className={selectedChip?.type === 'FREE_HIT' ? 'is-active' : undefined}
              onClick={() => onChipChange({ type: 'FREE_HIT' })}
            >
              Free Hit <small>One-week squad overhaul</small>
            </button>
            {([1, 2] as const).map((number) => (
              <button
                key={number}
                type="button"
                disabled={!chipStatus?.availability.WILDCARD[String(number) as '1' | '2']}
                className={selectedChip?.type === 'WILDCARD' && selectedChip.wildcardNumber === number ? 'is-active' : undefined}
                onClick={() => onChipChange({ type: 'WILDCARD', wildcardNumber: number })}
              >
                Wildcard {number} <small>Unlimited permanent transfers</small>
              </button>
            ))}
          </fieldset>
        ) : null}
        <p className="text-sm text-white/60">
          These changes apply to your squad when confirmed. Point hits apply to the target gameweek.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading} disabled={isLoading}>
            Confirm transfers
          </Button>
        </div>
      </div>
    </Modal>
  );
}
