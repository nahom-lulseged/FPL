import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useFinanceMutations, useStakedLeaguesAdmin } from '@/hooks/useFinance';

export function DisputeResolutionPage() {
  const { data } = useStakedLeaguesAdmin();
  const { freezeLeague } = useFinanceMutations();
  const [leagueId, setLeagueId] = useState('');
  const [reason, setReason] = useState('');

  const leagues = (data as { data?: Array<{ id: string; name: string; payoutStatus: string }> })?.data ?? [];

  return (
    <div className="mt-6 space-y-4 max-w-lg">
      <p className="text-sm text-fpl-gray-500">
        Freeze a league&apos;s payout status for manual investigation.
      </p>
      <label className="block text-sm font-medium">
        League
        <select
          className="mt-1 w-full rounded border border-fpl-gray-300 px-3 py-2"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
        >
          <option value="">Select league</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.payoutStatus})
            </option>
          ))}
        </select>
      </label>
      <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button
        onClick={() => {
          if (leagueId && reason.trim()) {
            freezeLeague.mutate({ leagueId, reason });
            setReason('');
          }
        }}
        disabled={!leagueId || !reason.trim()}
      >
        Freeze payout
      </Button>
    </div>
  );
}
