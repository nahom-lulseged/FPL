import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveDeposit,
  approveWithdrawal,
  commitPayout,
  freezeLeaguePayout,
  getCommissionDashboard,
  listPendingDeposits,
  listPendingWithdrawals,
  listStakedLeaguesAdmin,
  listTransactions,
  lookupWallet,
  previewPayout,
  rejectDeposit,
  rejectWithdrawal,
  runReconciliation,
  type TransactionKind,
} from '@/api/adminFinance.api';
import { getErrorMessage } from '@/types/api';
import { useToast } from '@/store/toastStore';

export function useWalletLookup(email: string) {
  return useQuery({
    queryKey: ['admin', 'finance', 'wallet', email],
    queryFn: () => lookupWallet(email),
    enabled: email.includes('@'),
  });
}

export function usePendingWithdrawals(page = 1) {
  return useQuery({
    queryKey: ['admin', 'finance', 'withdrawals', page],
    queryFn: () => listPendingWithdrawals({ page }),
  });
}

export function usePendingDeposits(page = 1) {
  return useQuery({
    queryKey: ['admin', 'finance', 'deposits', page],
    queryFn: () => listPendingDeposits({ page }),
  });
}

export function useTransactions(params: {
  type?: 'all' | TransactionKind;
  page?: number;
  limit?: number;
} = {}) {
  const type = params.type ?? 'all';
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  return useQuery({
    queryKey: ['admin', 'finance', 'transactions', type, page, limit],
    queryFn: () => listTransactions({ type, page, limit }),
  });
}

export function useStakedLeaguesAdmin(page = 1) {
  return useQuery({
    queryKey: ['admin', 'finance', 'staked-leagues', page],
    queryFn: () => listStakedLeaguesAdmin({ page }),
  });
}

export function useCommissionDashboard() {
  return useQuery({
    queryKey: ['admin', 'finance', 'commission'],
    queryFn: getCommissionDashboard,
  });
}

export function useFinanceMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
  };

  return {
    approveDeposit: useMutation({
      mutationFn: approveDeposit,
      onSuccess: () => {
        invalidate();
        toast.success('Deposit approved');
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to approve deposit')),
    }),
    rejectDeposit: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDeposit(id, reason),
      onSuccess: () => {
        invalidate();
        toast.success('Deposit rejected');
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to reject deposit')),
    }),
    approveWithdrawal: useMutation({
      mutationFn: approveWithdrawal,
      onSuccess: () => {
        invalidate();
        toast.success('Withdrawal approved');
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to approve withdrawal')),
    }),
    rejectWithdrawal: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectWithdrawal(id, reason),
      onSuccess: () => {
        invalidate();
        toast.success('Withdrawal rejected');
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to reject withdrawal')),
    }),
    previewPayout: useMutation({
      mutationFn: previewPayout,
    }),
    commitPayout: useMutation({
      mutationFn: ({
        leagueId,
        previewToken,
        reason,
      }: {
        leagueId: string;
        previewToken: string;
        reason: string;
      }) => commitPayout(leagueId, previewToken, reason),
      onSuccess: invalidate,
    }),
    freezeLeague: useMutation({
      mutationFn: ({ leagueId, reason }: { leagueId: string; reason: string }) =>
        freezeLeaguePayout(leagueId, reason),
      onSuccess: invalidate,
    }),
    runReconciliation: useMutation({
      mutationFn: runReconciliation,
      onSuccess: invalidate,
    }),
  };
}
