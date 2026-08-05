import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { StakeAmountInput } from '@/components/leagues/StakeAmountInput';
import { useCreateLeague } from '@/hooks/useCreateLeague';
import { useWallet } from '@/hooks/useWallet';
import { CURRENT_SEASON } from '@/lib/config';
import { majorToMinor, formatMinor } from '@/lib/money';
import { getErrorMessage, getFieldErrors } from '@/types/api';

interface CreateLeagueFormProps {
  onSuccess: (leagueId: string) => void;
}

export function CreateLeagueForm({ onSuccess }: CreateLeagueFormProps) {
  const [name, setName] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [enableStake, setEnableStake] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateLeague();
  const { data: wallet } = useWallet();

  const stakeMinor = enableStake && stakeAmount ? majorToMinor(Number.parseFloat(stakeAmount)) : 0;

  async function submitCreate() {
    setError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFieldErrors({ name: 'League name is required' });
      return;
    }

    try {
      const league = await createMutation.mutateAsync({
        name: trimmedName,
        type: 'CLASSIC',
        season: CURRENT_SEASON,
        ...(enableStake && stakeMinor > 0
          ? { stakeAmountMinor: stakeMinor, isPrivate }
          : {}),
      });
      setConfirmOpen(false);
      onSuccess(league.id);
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Failed to create league'));
      setConfirmOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enableStake && stakeMinor > 0) {
      setConfirmOpen(true);
    } else {
      void submitCreate();
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="League name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Office League"
          maxLength={80}
          error={fieldErrors.name}
          disabled={createMutation.isPending}
        />

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={enableStake}
            onChange={(e) => setEnableStake(e.target.checked)}
            className="rounded border-white/20"
          />
          Staked league (real money entry)
        </label>

        {enableStake ? (
          <>
            <StakeAmountInput
              value={stakeAmount}
              onChange={setStakeAmount}
              error={fieldErrors.stakeAmountMinor}
              disabled={createMutation.isPending}
            />
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-white/20"
              />
              Private (invite-only, not listed publicly)
            </label>
          </>
        ) : null}

        <p className="text-xs text-white/50">
          Classic league for {CURRENT_SEASON}. You will be added automatically
          {enableStake ? ' and charged your stake on creation' : ' and receive an invite code to share'}.
        </p>

        {error ? (
          <p className="rounded-md border border-fpl-pink/30 bg-fpl-pink/10 px-3 py-2 text-sm text-fpl-pink">
            {error}
          </p>
        ) : null}

        <Button type="submit" isLoading={createMutation.isPending} fullWidth>
          {enableStake ? 'Review & create' : 'Create league'}
        </Button>
      </form>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm stake" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            You will be charged <strong className="text-fpl-gold">{formatMinor(stakeMinor)}</strong> to create this staked league.
          </p>
          {wallet ? (
            <p className="text-sm text-white/60">
              Balance after: {formatMinor(wallet.balanceMinor - stakeMinor)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} isLoading={createMutation.isPending}>
              Confirm & create
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
