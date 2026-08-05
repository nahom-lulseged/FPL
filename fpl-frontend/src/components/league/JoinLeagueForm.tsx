import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { JoinStakeConfirmDialog } from '@/components/leagues/JoinStakeConfirmDialog';
import { useJoinLeague } from '@/hooks/useJoinLeague';
import { useWallet } from '@/hooks/useWallet';
import { getErrorMessage, getFieldErrors } from '@/types/api';
import type { LeagueSummary } from '@/types/league';

interface JoinLeagueFormProps {
  onSuccess: (leagueId: string) => void;
  /** When joining from public browser with known stake */
  pendingLeague?: Pick<LeagueSummary, 'id' | 'name' | 'stakeAmountMinor'>;
}

export function JoinLeagueForm({ onSuccess, pendingLeague }: JoinLeagueFormProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const joinMutation = useJoinLeague();
  const { data: wallet } = useWallet();

  async function executeJoin(code: string) {
    setError(null);
    setFieldErrors({});

    try {
      const league = await joinMutation.mutateAsync({ inviteCode: code });
      setInviteCode('');
      setConfirmOpen(false);
      onSuccess(league.id);
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Failed to join league'));
      setConfirmOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setFieldErrors({ inviteCode: 'Invite code is required' });
      return;
    }

    if (pendingLeague?.stakeAmountMinor) {
      setConfirmOpen(true);
    } else {
      void executeJoin(trimmedCode);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Invite code"
              name="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. XK7M2P9Q"
              maxLength={12}
              error={fieldErrors.inviteCode}
              disabled={joinMutation.isPending}
              className="font-mono tracking-wider"
            />
          </div>
          <Button type="submit" isLoading={joinMutation.isPending} className="sm:mb-0 sm:shrink-0">
            Join league
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-fpl-pink/30 bg-fpl-pink/10 px-3 py-2 text-sm text-fpl-pink">
            {error}
          </p>
        ) : null}
      </form>

      {pendingLeague?.stakeAmountMinor ? (
        <JoinStakeConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void executeJoin(inviteCode.trim())}
          stakeAmountMinor={pendingLeague.stakeAmountMinor}
          walletBalanceMinor={wallet?.balanceMinor ?? 0}
          leagueName={pendingLeague.name}
          isLoading={joinMutation.isPending}
        />
      ) : null}
    </>
  );
}
