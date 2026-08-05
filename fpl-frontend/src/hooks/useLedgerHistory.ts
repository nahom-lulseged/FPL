import { useQuery } from '@tanstack/react-query';
import { getLedgerHistory } from '@/api/wallet.api';

export function useLedgerHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['wallet', 'ledger', page, limit],
    queryFn: () => getLedgerHistory({ page, limit }),
    staleTime: 15_000,
  });
}
