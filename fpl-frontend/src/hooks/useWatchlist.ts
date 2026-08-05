import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  getWatchlistIds,
  getWatchlistSnapshot,
  subscribeWatchlist,
  toggleWatchlistId,
} from '@/lib/watchlistStorage';

function getServerSnapshot(): string {
  return '[]';
}

export function useWatchlist() {
  const snapshot = useSyncExternalStore(
    subscribeWatchlist,
    getWatchlistSnapshot,
    getServerSnapshot,
  );

  const ids = useMemo(() => {
    try {
      return JSON.parse(snapshot) as string[];
    } catch {
      return getWatchlistIds();
    }
  }, [snapshot]);

  const isWatched = useCallback((playerId: string) => ids.includes(playerId), [ids]);

  const toggle = useCallback((playerId: string) => {
    toggleWatchlistId(playerId);
  }, []);

  return {
    ids,
    count: ids.length,
    isWatched,
    toggle,
  };
}
