const WATCHLIST_KEY = 'fpl.watchlist.ids';

const listeners = new Set<() => void>();
let memoryStore: string[] = [];

function notifyWatchlistListeners(): void {
  listeners.forEach((listener) => listener());
}

function canUseLocalStorage(): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) {
      return false;
    }
    const probe = '__fpl_watchlist_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readRaw(): string | null {
  if (!canUseLocalStorage()) {
    return memoryStore.length > 0 ? JSON.stringify(memoryStore) : null;
  }
  try {
    return globalThis.localStorage.getItem(WATCHLIST_KEY);
  } catch {
    return null;
  }
}

function writeRaw(ids: string[]): void {
  memoryStore = ids;
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    globalThis.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
  } catch {
    // Quota / private mode — memoryStore still holds the value
  }
}

export function getWatchlistIds(): string[] {
  const raw = readRaw();
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export function setWatchlistIds(ids: string[]): void {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  writeRaw(unique);
  notifyWatchlistListeners();
}

export function clearWatchlist(): void {
  memoryStore = [];
  if (canUseLocalStorage()) {
    try {
      globalThis.localStorage.removeItem(WATCHLIST_KEY);
    } catch {
      // ignore
    }
  }
  notifyWatchlistListeners();
}

export function toggleWatchlistId(playerId: string): string[] {
  const current = getWatchlistIds();
  const next = current.includes(playerId)
    ? current.filter((id) => id !== playerId)
    : [...current, playerId];
  setWatchlistIds(next);
  return next;
}

export function subscribeWatchlist(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === WATCHLIST_KEY || event.key === null) {
      listener();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

/** Stable snapshot string for useSyncExternalStore. */
export function getWatchlistSnapshot(): string {
  return JSON.stringify(getWatchlistIds());
}

export const WATCHLIST_STORAGE_KEY = WATCHLIST_KEY;
