import { useQuery } from '@tanstack/react-query';
import { getPlayer } from '@/api/players.api';

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => getPlayer(playerId!),
    enabled: Boolean(playerId),
    staleTime: 60_000,
  });
}
