import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as scoringApi from '@/api/scoring.api';

export function useStatTypes() {
  return useQuery({
    queryKey: ['admin', 'scoring', 'stat-types'],
    queryFn: scoringApi.listStatTypes,
    staleTime: 60_000,
  });
}

export function useRecalculationHistory(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'scoring', 'history', params],
    queryFn: () => scoringApi.listRecalculationHistory(params),
  });
}

export function useRecalculationHistoryEntry(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'scoring', 'history', id],
    queryFn: () => scoringApi.getRecalculationHistoryEntry(id!),
    enabled: Boolean(id),
  });
}

export function usePreviewRecalculate() {
  return useMutation({
    mutationFn: (gameweekId: string) => scoringApi.previewRecalculate(gameweekId),
  });
}

export function useCommitRecalculate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      gameweekId,
      previewToken,
      reason,
    }: {
      gameweekId: string;
      previewToken: string;
      reason: string;
    }) => scoringApi.commitRecalculate(gameweekId, { previewToken, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scoring', 'history'] });
    },
  });
}

export function usePreviewCorrection() {
  return useMutation({
    mutationFn: scoringApi.previewCorrection,
  });
}

export function useCommitCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scoringApi.commitCorrection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scoring', 'history'] });
    },
  });
}
