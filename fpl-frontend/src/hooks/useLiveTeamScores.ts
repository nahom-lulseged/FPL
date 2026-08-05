import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { SOCKET_EVENTS } from '@/lib/socketEvents';
import type { TeamScoreUpdatedPayload } from '@/lib/socketTypes';
import { useSocket } from '@/hooks/useSocket';

const LIVE_POLL_INTERVAL_MS = 30_000;

export function useLiveTeamScores(
  teamId: string | undefined,
  gameweekNumber: number | undefined,
  enabled = true,
): void {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const handleTeamScoreUpdated = useCallback(
    (payload: TeamScoreUpdatedPayload) => {
      if (payload.teamId !== teamId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ['team', teamId, gameweekNumber],
      });
      void queryClient.invalidateQueries({
        queryKey: ['teamGwBreakdown', teamId, gameweekNumber],
      });
    },
    [teamId, gameweekNumber, queryClient],
  );

  useEffect(() => {
    if (!socket || !teamId || !enabled) {
      return;
    }

    socket.emit('join:team', teamId);

    return () => {
      socket.emit('leave:team', teamId);
    };
  }, [socket, teamId, enabled]);

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    socket.on(SOCKET_EVENTS.TEAM_SCORE_UPDATED, handleTeamScoreUpdated);
    return () => {
      socket.off(SOCKET_EVENTS.TEAM_SCORE_UPDATED, handleTeamScoreUpdated);
    };
  }, [socket, enabled, handleTeamScoreUpdated]);

  useEffect(() => {
    if (!teamId || !gameweekNumber || !enabled || isConnected) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: ['team', teamId, gameweekNumber],
      });
      void queryClient.invalidateQueries({
        queryKey: ['teamGwBreakdown', teamId, gameweekNumber],
      });
    }, LIVE_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [teamId, gameweekNumber, enabled, isConnected, queryClient]);
}
