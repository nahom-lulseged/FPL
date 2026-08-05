import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { PayoutPreviewDiff } from '@/components/finance/PayoutPreviewDiff';
import { useFinanceMutations, useStakedLeaguesAdmin } from '@/hooks/useFinance';
import type { PayoutPreviewResponse } from '@/api/adminFinance.api';

export function PayoutReviewPage() {
  const { data } = useStakedLeaguesAdmin();
  const { previewPayout, commitPayout } = useFinanceMutations();
  const [preview, setPreview] = useState<PayoutPreviewResponse | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const leagues = (data as { data?: Array<{ id: string; name: string; payoutStatus: string; potTotalMinor: number }> })?.data ?? [];

  return (
    <div className="mt-6 space-y-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-fpl-gray-200 text-fpl-gray-500">
            <th className="py-2">League</th>
            <th className="py-2">Pot</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {leagues.map((league) => (
            <tr key={league.id} className="border-b border-fpl-gray-100">
              <td className="py-2">{league.name}</td>
              <td className="py-2">{(league.potTotalMinor / 100).toFixed(2)} ETB</td>
              <td className="py-2">{league.payoutStatus}</td>
              <td className="py-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setSelectedLeagueId(league.id);
                    const result = await previewPayout.mutateAsync(league.id);
                    setPreview(result);
                  }}
                >
                  Preview payout
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {preview ? (
        <div className="rounded-lg border border-fpl-gray-200 p-4 space-y-4">
          <PayoutPreviewDiff preview={preview.preview} />
          <Input
            label="Commit reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            onClick={() => {
              if (selectedLeagueId && reason.trim()) {
                commitPayout.mutate({
                  leagueId: selectedLeagueId,
                  previewToken: preview.previewToken,
                  reason,
                });
                setPreview(null);
                setReason('');
              }
            }}
            disabled={!reason.trim()}
            isLoading={commitPayout.isPending}
          >
            Commit payout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
