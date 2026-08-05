import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useFinanceMutations, usePendingWithdrawals } from '@/hooks/useFinance';

export function WithdrawalQueuePage() {
  const { data, isLoading } = usePendingWithdrawals();
  const { approveWithdrawal, rejectWithdrawal } = useFinanceMutations();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (isLoading) return <p className="mt-6 text-fpl-gray-500">Loading…</p>;

  const rows = data?.data ?? [];

  return (
    <div className="mt-6">
      {rows.length === 0 ? (
        <p className="text-fpl-gray-500">No pending withdrawals.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-fpl-gray-200 text-fpl-gray-500">
              <th className="py-2">User</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-fpl-gray-100">
                <td className="py-2">{row.user.email}</td>
                <td className="py-2">{(row.amountMinor / 100).toFixed(2)} ETB</td>
                <td className="py-2 flex gap-2">
                  <Button
                    onClick={() => approveWithdrawal.mutate(row.id)}
                    isLoading={approveWithdrawal.isPending}
                  >
                    Approve
                  </Button>
                  <Button variant="secondary" onClick={() => setRejectId(row.id)}>
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={rejectId !== null} onClose={() => setRejectId(null)} title="Reject withdrawal">
        <div className="space-y-4">
          <Input
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            onClick={() => {
              if (rejectId && reason.trim()) {
                rejectWithdrawal.mutate({ id: rejectId, reason });
                setRejectId(null);
                setReason('');
              }
            }}
            disabled={!reason.trim()}
          >
            Confirm reject
          </Button>
        </div>
      </Modal>
    </div>
  );
}
