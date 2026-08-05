import clsx from 'clsx';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { CHIP_META, formatChipLabel } from '@/lib/chipMeta';
import type { ChipType } from '@/types/chip';

interface ChipConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chipType: ChipType;
  wildcardNumber?: 1 | 2;
  isLoading: boolean;
}

export function ChipConfirmModal({
  open,
  onClose,
  onConfirm,
  chipType,
  wildcardNumber,
  isLoading,
}: ChipConfirmModalProps) {
  const meta = CHIP_META[chipType];
  const label = formatChipLabel(chipType, wildcardNumber);

  return (
    <Modal open={open} onClose={onClose} title={`Play ${label}?`} className="max-w-md">
      <div className="space-y-4">
        <p className={clsx('text-sm font-semibold', meta.accentClass)}>{meta.shortDescription}</p>
        <p className="text-sm text-white/70">{meta.confirmDescription}</p>
        {chipType === 'FREE_HIT' ? (
          <p className="rounded-lg border border-fpl-cyan/30 bg-fpl-cyan/10 px-3 py-2 text-sm text-fpl-cyan">
            Your squad will revert to its current state at the start of the next gameweek.
          </p>
        ) : null}
        {chipType === 'WILDCARD' ? (
          <p className="rounded-lg border border-fpl-gold/30 bg-fpl-gold/10 px-3 py-2 text-sm text-fpl-gold">
            You can make unlimited transfers with no point hits this gameweek.
          </p>
        ) : null}
        <p className="text-xs text-white/50">
          Only one chip can be played per gameweek. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading} disabled={isLoading}>
            Play chip
          </Button>
        </div>
      </div>
    </Modal>
  );
}
