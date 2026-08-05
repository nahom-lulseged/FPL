import { create } from 'zustand';
import type { PlayerListItem } from '@/types/player';
import type { PendingTransfer, TransferChipSelection } from '@/types/transfer';

interface TransferState {
  pendingTransfers: PendingTransfer[];
  activeRemovedPlayerId: string | null;
  selectedChip: TransferChipSelection | null;
  openRemoval: (playerId: string | null) => void;
  setSelectedChip: (chip: TransferChipSelection | null) => void;
  addTransfer: (playerOut: PlayerListItem, playerIn: PlayerListItem) => void;
  removeTransfer: (playerOutId: string) => void;
  clearAll: () => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  pendingTransfers: [],
  activeRemovedPlayerId: null,
  selectedChip: null,

  openRemoval(playerId) {
    set({ activeRemovedPlayerId: playerId });
  },

  setSelectedChip(chip) {
    set({ selectedChip: chip });
  },

  addTransfer(playerOut, playerIn) {
    set((state) => ({
      pendingTransfers: [
        ...state.pendingTransfers.filter((t) => t.playerOutId !== playerOut.id),
        { playerOutId: playerOut.id, playerInId: playerIn.id, playerOut, playerIn },
      ],
      activeRemovedPlayerId: null,
    }));
  },

  removeTransfer(playerOutId) {
    set((state) => ({
      pendingTransfers: state.pendingTransfers.filter((t) => t.playerOutId !== playerOutId),
    }));
  },

  clearAll() {
    set({ pendingTransfers: [], activeRemovedPlayerId: null, selectedChip: null });
  },
}));
