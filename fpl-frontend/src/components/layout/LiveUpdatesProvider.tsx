import type { ReactNode } from 'react';
import { useLiveGameweek } from '@/hooks/useLiveGameweek';
import { useLiveNotifications } from '@/hooks/useLiveNotifications';
import { useSocket } from '@/hooks/useSocket';
import { useGameweekStore } from '@/store/gameweekStore';

interface LiveUpdatesProviderProps {
  children: ReactNode;
}

export function LiveUpdatesProvider({ children }: LiveUpdatesProviderProps) {
  useSocket();
  useLiveNotifications();

  const currentGameweekNumber = useGameweekStore((s) => s.currentGameweek?.number);
  const isLive = useGameweekStore((s) => s.currentGameweek?.status === 'LIVE');

  useLiveGameweek(currentGameweekNumber ?? undefined, isLive);

  return children;
}
