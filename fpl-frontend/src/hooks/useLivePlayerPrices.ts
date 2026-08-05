import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { SOCKET_EVENTS } from '@/lib/socketEvents';
import type { PlayerPriceChangedPayload } from '@/lib/socketTypes';
import { useSocketEvent } from '@/hooks/useSocket';

export function useLivePlayerPrices(enabled = true): void {
  const queryClient = useQueryClient();

  const handlePriceChanged = useCallback(
    (_payload: PlayerPriceChangedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    [queryClient],
  );

  useSocketEvent(SOCKET_EVENTS.PLAYER_PRICE_CHANGED, handlePriceChanged, enabled);
}
