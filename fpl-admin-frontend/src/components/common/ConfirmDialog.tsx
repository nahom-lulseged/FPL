import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  requiredText?: string;
  confirmInputLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  requiredText,
  confirmInputLabel = 'Type to confirm',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (!open) {
      setTypedText('');
    }
  }, [open]);

  const requiresMatch = requiredText !== undefined;
  const canConfirm = !requiresMatch || typedText === requiredText;

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-fpl-gray-600">{description}</p>

      {requiresMatch ? (
        <div className="mt-4">
          <Input
            label={confirmInputLabel}
            value={typedText}
            onChange={(event) => setTypedText(event.target.value)}
            placeholder={requiredText}
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={!canConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
