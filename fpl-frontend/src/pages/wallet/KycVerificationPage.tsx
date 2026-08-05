import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { FullPageSpinner } from '@/components/common/Spinner';
import {
  acceptTerms,
  getComplianceStatus,
  submitKyc,
  verifyAge,
} from '@/api/payments.api';
import { getErrorMessage } from '@/types/api';

export function KycVerificationPage() {
  const [documentRef, setDocumentRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['compliance'],
    queryFn: getComplianceStatus,
  });

  const termsMutation = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['compliance'] }),
  });

  const ageMutation = useMutation({
    mutationFn: verifyAge,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['compliance'] }),
  });

  const kycMutation = useMutation({
    mutationFn: () => submitKyc(documentRef),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['compliance'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading || !status) {
    return <FullPageSpinner />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Verification</h1>
      <p className="text-sm text-white/60">
        Complete these steps before joining staked leagues or withdrawing funds.
      </p>

      <section className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4 space-y-3">
        <h2 className="font-semibold text-white">Terms of service</h2>
        <p className="text-xs text-white/50">Version {status.termsVersion}</p>
        {status.termsAcceptedAt ? (
          <p className="text-sm text-fpl-green">Accepted</p>
        ) : (
          <Button onClick={() => termsMutation.mutate()} isLoading={termsMutation.isPending}>
            Accept terms
          </Button>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4 space-y-3">
        <h2 className="font-semibold text-white">Age verification</h2>
        {status.ageVerifiedAt ? (
          <p className="text-sm text-fpl-green">Verified</p>
        ) : (
          <Button onClick={() => ageMutation.mutate()} isLoading={ageMutation.isPending}>
            I confirm I am 18 or older
          </Button>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4 space-y-3">
        <h2 className="font-semibold text-white">KYC (for withdrawals)</h2>
        {status.kycVerifiedAt ? (
          <p className="text-sm text-fpl-green">Verified</p>
        ) : (
          <>
            <Input
              label="Document reference / ID number"
              value={documentRef}
              onChange={(e) => setDocumentRef(e.target.value)}
            />
            {error ? <p className="text-sm text-fpl-pink">{error}</p> : null}
            <Button
              onClick={() => kycMutation.mutate()}
              isLoading={kycMutation.isPending}
              disabled={!documentRef.trim()}
            >
              Submit for review
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
