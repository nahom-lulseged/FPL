import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LedgerTable } from '@/components/finance/LedgerTable';
import { ReconciliationStatusBadge } from '@/components/finance/ReconciliationStatusBadge';
import { useWalletLookup } from '@/hooks/useFinance';

export function WalletLookupPage() {
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const { data, isFetching, refetch } = useWalletLookup(searchEmail);

  return (
    <div className="mt-6 space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchEmail(email.trim());
        }}
      >
        <Input
          label="User email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="flex-1"
        />
        <Button type="submit" className="self-end">
          Search
        </Button>
      </form>

      {data ? (
        <div className="space-y-4 rounded-lg border border-fpl-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{data.user.displayName}</p>
              <p className="text-sm text-fpl-gray-500">{data.user.email}</p>
            </div>
            <ReconciliationStatusBadge matches={data.reconciliation.matches} />
          </div>
          <p className="text-lg font-bold">
            Balance: {(data.wallet.balanceMinor / 100).toFixed(2)} {data.wallet.currency}
          </p>
          <LedgerTable entries={data.ledger} />
          <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>
      ) : null}
    </div>
  );
}
