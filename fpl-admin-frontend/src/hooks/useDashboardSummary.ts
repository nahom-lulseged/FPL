import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/api/dashboard.api';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    staleTime: 30_000,
  });
}
