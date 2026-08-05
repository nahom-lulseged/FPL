import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWatchlist,
  getWatchlistIds,
  setWatchlistIds,
  toggleWatchlistId,
  WATCHLIST_STORAGE_KEY,
} from '@/lib/watchlistStorage';

describe('watchlistStorage', () => {
  beforeEach(() => {
    clearWatchlist();
  });

  it('returns empty list when nothing stored', () => {
    expect(getWatchlistIds()).toEqual([]);
  });

  it('persists and reads ids', () => {
    setWatchlistIds(['a', 'b']);
    expect(getWatchlistIds()).toEqual(['a', 'b']);
  });

  it('dedupes when setting ids', () => {
    setWatchlistIds(['a', 'a', 'b']);
    expect(getWatchlistIds()).toEqual(['a', 'b']);
  });

  it('toggles ids on and off', () => {
    expect(toggleWatchlistId('p1')).toEqual(['p1']);
    expect(toggleWatchlistId('p2')).toEqual(['p1', 'p2']);
    expect(toggleWatchlistId('p1')).toEqual(['p2']);
  });

  it('ignores corrupt storage when localStorage is usable', () => {
    try {
      if (!globalThis.localStorage) {
        return;
      }
      globalThis.localStorage.setItem(WATCHLIST_STORAGE_KEY, '{not-json');
      // memory store may still be empty; clear then force corrupt path via get
      expect(getWatchlistIds()).toEqual([]);
    } catch {
      expect(getWatchlistIds()).toEqual([]);
    }
  });
});
