import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { SOCKET_EVENTS } from '@/lib/socketEvents';
import type { StandingsUpdatedPayload } from '@/lib/socketTypes';
import { useSocket } from '@/hooks/useSocket';

export function useLiveLeagueStandings(
  leagueId: string | undefined,
  enabled = true,
): void {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const handleStandingsUpdated = useCallback(
    (payload: StandingsUpdatedPayload) => {
      if (payload.leagueId !== leagueId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.leagueStandings(leagueId),
      });
    },
    [leagueId, queryClient],
  );

  useEffect(() => {
    if (!socket || !leagueId || !enabled) {
      return;
    }

    socket.emit('join:league', leagueId);

    return () => {
      socket.emit('leave:league', leagueId);
    };
  }, [socket, leagueId, enabled]);

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    socket.on(SOCKET_EVENTS.STANDINGS_UPDATED, handleStandingsUpdated);
    return () => {
      socket.off(SOCKET_EVENTS.STANDINGS_UPDATED, handleStandingsUpdated);
    };
  }, [socket, enabled, handleStandingsUpdated]);
}
