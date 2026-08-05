import { beforeEach, describe, expect, it } from 'vitest';
import { useTransferStore } from '@/store/transferStore';
import { DEFAULT_PLAYER_STATS, type PlayerListItem } from '@/types/player';

function makePlayer(id: string): PlayerListItem {
  return {
    ...DEFAULT_PLAYER_STATS,
    id,
    name: id,
    position: 'MID',
    price: 50,
    isAvailable: true,
    realTeam: { id: `club-${id}`, name: `Club ${id}`, shortName: id.slice(0, 3).toUpperCase() },
  };
}

describe('transferStore', () => {
  beforeEach(() => useTransferStore.getState().clearAll());

  it('keeps completed replacements while managing one active removed slot', () => {
    const out = makePlayer('out');
    const incoming = makePlayer('in');
    useTransferStore.getState().openRemoval(out.id);
    expect(useTransferStore.getState().activeRemovedPlayerId).toBe(out.id);
    useTransferStore.getState().addTransfer(out, incoming);
    expect(useTransferStore.getState().pendingTransfers).toHaveLength(1);
    expect(useTransferStore.getState().activeRemovedPlayerId).toBeNull();
  });

  it('reset clears swaps, empty slot, and selected chip', () => {
    const out = makePlayer('out');
    useTransferStore.getState().openRemoval(out.id);
    useTransferStore.getState().setSelectedChip({ type: 'FREE_HIT' });
    useTransferStore.getState().clearAll();
    expect(useTransferStore.getState()).toMatchObject({
      pendingTransfers: [],
      activeRemovedPlayerId: null,
      selectedChip: null,
    });
  });
});
