import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { initiateDeposit } from '@/api/payments.api';
import { getErrorMessage } from '@/types/api';
import { useTelegram } from '@/lib/telegram';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

export function DepositModal({ open, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { openExternalLink } = useTelegram();

  const depositMutation = useMutation({
    mutationFn: (amountMajor: number) => initiateDeposit(amountMajor),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      openExternalLink(data.redirectUrl);
    },
    onError: (err) => setError(getErrorMessage(err, 'Deposit failed')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    depositMutation.mutate(parsed);
  }

  return (
    <Modal open={open} onClose={onClose} title="Deposit with Telebirr" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Amount (ETB)"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={depositMutation.isPending}
        />
        {error ? <p className="text-sm text-fpl-pink">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={depositMutation.isPending}>
            Continue to Telebirr
          </Button>
        </div>
      </form>
    </Modal>
  );
}
