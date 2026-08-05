import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { SOCKET_EVENTS } from '@/lib/socketEvents';
import type { GwStatsUpdatedPayload } from '@/lib/socketTypes';
import { useSocket } from '@/hooks/useSocket';

export function useLiveGameweek(
  gameweekNumber: number | undefined,
  enabled = true,
  teamId?: string,
): { isSubscribed: boolean } {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const handleGwStatsUpdated = useCallback(
    (payload: GwStatsUpdatedPayload) => {
      if (payload.gameweekNumber !== gameweekNumber) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ['players'] });
      void queryClient.invalidateQueries({ queryKey: ['fixtures'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['teamGwBreakdown'] });

      if (teamId) {
        void queryClient.invalidateQueries({
          queryKey: ['team', teamId, gameweekNumber],
        });
        void queryClient.invalidateQueries({
          queryKey: ['teamGwBreakdown', teamId, gameweekNumber],
        });
      }
    },
    [gameweekNumber, teamId, queryClient],
  );

  useEffect(() => {
    if (!socket || !gameweekNumber || !enabled) {
      return;
    }

    socket.emit('join:gw', gameweekNumber);

    return () => {
      socket.emit('leave:gw', gameweekNumber);
    };
  }, [socket, gameweekNumber, enabled]);

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    socket.on(SOCKET_EVENTS.GW_STATS_UPDATED, handleGwStatsUpdated);
    return () => {
      socket.off(SOCKET_EVENTS.GW_STATS_UPDATED, handleGwStatsUpdated);
    };
  }, [socket, enabled, handleGwStatsUpdated]);

  return { isSubscribed: Boolean(socket && gameweekNumber && enabled) };
}
