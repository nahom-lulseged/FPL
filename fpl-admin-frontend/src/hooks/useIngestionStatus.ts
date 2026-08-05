import { useQuery } from '@tanstack/react-query';
import { getIngestionStatus } from '@/api/ingestion.api';

export function useIngestionStatus() {
  return useQuery({
    queryKey: ['ingestion', 'status'],
    queryFn: getIngestionStatus,
    refetchInterval: 30_000,
  });
}
