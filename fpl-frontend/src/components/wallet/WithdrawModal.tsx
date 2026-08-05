import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { requestWithdrawal } from '@/api/payments.api';
import { getErrorMessage } from '@/types/api';
import { useToast } from '@/store/toastStore';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  maxAmountMinor: number;
  canWithdraw: boolean;
}

export function WithdrawModal({ open, onClose, maxAmountMinor, canWithdraw }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const withdrawMutation = useMutation({
    mutationFn: (amountMajor: number) => requestWithdrawal(amountMajor),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Withdrawal requested — pending admin review');
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Withdrawal request failed')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (parsed * 100 > maxAmountMinor) {
      setError('Amount exceeds available balance');
      return;
    }
    withdrawMutation.mutate(parsed);
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw funds" className="max-w-md">
      {!canWithdraw ? (
        <div className="space-y-4">
          <p className="text-sm text-white/70">KYC verification is required before withdrawing.</p>
          <Link to="/wallet/kyc" className="text-fpl-green underline" onClick={onClose}>
            Complete verification
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Amount (ETB)"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={withdrawMutation.isPending}
          />
          <p className="text-xs text-white/50">
            Withdrawals are reviewed by admin before processing.
          </p>
          {error ? <p className="text-sm text-fpl-pink">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" isLoading={withdrawMutation.isPending}>
              Request withdrawal
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
