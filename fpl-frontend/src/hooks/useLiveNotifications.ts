import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useSocketEvent } from '@/hooks/useSocket';
import { formatPrice } from '@/lib/formatters';
import { SOCKET_EVENTS } from '@/lib/socketEvents';
import type {
  DeadlineReminderPayload,
  GwFinalizedPayload,
  PlayerPriceChangedPayload,
} from '@/lib/socketTypes';
import { useToast } from '@/store/toastStore';
import type { PaginatedResponse } from '@/types/api';
import type { PlayerListItem } from '@/types/player';

function formatMinutesUntil(minutes: number): string {
  if (minutes >= 1440) {
    return '24 hours';
  }
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

function findPlayerNameInCache(queryClient: QueryClient, playerId: string): string | null {
  const entries = queryClient.getQueriesData<PaginatedResponse<PlayerListItem>>({
    queryKey: ['players'],
  });

  for (const [, data] of entries) {
    const player = data?.data.find((p) => p.id === playerId);
    if (player) {
      return player.name;
    }
  }

  return null;
}

export function useLiveNotifications(enabled = true): void {
  const queryClient = useQueryClient();
  const toast = useToast();
  const shownDeadlineReminders = useRef(new Set<string>());

  const handleDeadlineReminder = useCallback(
    (payload: DeadlineReminderPayload) => {
      const key = `${payload.gameweekNumber}:${payload.minutesUntil}`;
      if (shownDeadlineReminders.current.has(key)) {
        return;
      }
      shownDeadlineReminders.current.add(key);

      const timeLabel = formatMinutesUntil(payload.minutesUntil);
      toast.info(`GW ${payload.gameweekNumber} deadline in ${timeLabel}`);
    },
    [toast],
  );

  const handlePriceChanged = useCallback(
    (payload: PlayerPriceChangedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['players'] });

      const name = findPlayerNameInCache(queryClient, payload.playerId);
      const direction = payload.newPrice > payload.oldPrice ? 'rose to' : 'fell to';
      const priceLabel = formatPrice(payload.newPrice);

      if (name) {
        toast.info(`${name} ${direction} ${priceLabel}`);
      } else {
        toast.info(`A player price ${direction} ${priceLabel}`);
      }
    },
    [queryClient, toast],
  );

  const handleGwFinalized = useCallback(
    (payload: GwFinalizedPayload) => {
      void queryClient.invalidateQueries({ queryKey: ['gameweeks'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['teamGwBreakdown'] });
      void queryClient.invalidateQueries({ queryKey: ['leagues'] });
      void queryClient.invalidateQueries({ queryKey: ['leagueStandings'] });
      void queryClient.invalidateQueries({ queryKey: ['league'] });

      toast.success(`GW ${payload.gameweekNumber} finalized — scores confirmed`);
    },
    [queryClient, toast],
  );

  useSocketEvent(SOCKET_EVENTS.DEADLINE_REMINDER, handleDeadlineReminder, enabled);
  useSocketEvent(SOCKET_EVENTS.PLAYER_PRICE_CHANGED, handlePriceChanged, enabled);
  useSocketEvent(SOCKET_EVENTS.GW_FINALIZED, handleGwFinalized, enabled);
}
