import { useQuery } from '@tanstack/react-query';
import { getWallet } from '@/api/wallet.api';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: getWallet,
    staleTime: 15_000,
  });
}
