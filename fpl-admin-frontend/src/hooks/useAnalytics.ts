import { useQuery } from '@tanstack/react-query';
import { getChipUsage, getGrowthMetrics, getTransferTrends } from '@/api/analytics.api';
import type { GrowthQueryParams } from '@/types/analytics';

export function useTransferTrends(gameweek?: number) {
  return useQuery({
    queryKey: ['analytics', 'transfers', gameweek ?? 'current'],
    queryFn: () => getTransferTrends(gameweek),
  });
}

export function useChipUsage() {
  return useQuery({
    queryKey: ['analytics', 'chips'],
    queryFn: getChipUsage,
  });
}

export function useGrowthMetrics(params: GrowthQueryParams) {
  return useQuery({
    queryKey: ['analytics', 'growth', params],
    queryFn: () => getGrowthMetrics(params),
  });
}
