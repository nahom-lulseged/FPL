import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listPlayers } from '@/api/players.api';
import type { ListPlayersParams } from '@/types/player';

export function usePlayers(filters: ListPlayersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['players', filters],
    queryFn: () => listPlayers(filters),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
