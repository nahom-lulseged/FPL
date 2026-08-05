import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPlayers, updatePlayerOverride } from '@/api/players.api';
import type { PlayerOverrideBody } from '@/types/player';

export function usePlayerSearch(search: string) {
  return useQuery({
    queryKey: ['players', 'search', search],
    queryFn: () => listPlayers({ search, limit: 20 }),
    enabled: search.length >= 2,
  });
}

export function useUpdatePlayerOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlayerOverrideBody }) =>
      updatePlayerOverride(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
