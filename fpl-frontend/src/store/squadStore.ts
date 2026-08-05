import { create } from 'zustand';
import {
  assignLineupForFormation,
  canAddPlayer,
  DEFAULT_FORMATION,
  getValidationErrors,
  SQUAD_SIZE,
  type Formation,
  type LineupSlot,
} from '@/lib/fplRules';
import type { PlayerListItem, Position } from '@/types/player';

interface SquadState {
  selectedPlayers: PlayerListItem[];
  activeSlot: Position | null;
  activeSlotIndex: number | null;
  formation: Formation;
  lineup: LineupSlot[];
  captainId: string | null;
  viceCaptainId: string | null;
  setActiveSlot: (position: Position, index: number) => void;
  clearActiveSlot: () => void;
  addPlayer: (player: PlayerListItem) => void;
  removePlayer: (playerId: string) => void;
  setFormation: (formation: Formation) => void;
  setCaptain: (playerId: string | null) => void;
  setViceCaptain: (playerId: string | null) => void;
  cycleCaptainOnPlayer: (playerId: string) => void;
  reset: () => void;
  isComplete: () => boolean;
  getErrors: () => string[];
  getLineupForSubmit: () => LineupSlot[];
}

function recomputeLineup(
  players: PlayerListItem[],
  formation: Formation,
  captainId: string | null,
  viceCaptainId: string | null,
): LineupSlot[] {
  if (players.length !== SQUAD_SIZE) {
    return [];
  }
  return assignLineupForFormation(players, formation, captainId, viceCaptainId);
}

const initialState = {
  selectedPlayers: [] as PlayerListItem[],
  activeSlot: null as Position | null,
  activeSlotIndex: null as number | null,
  formation: DEFAULT_FORMATION,
  lineup: [] as LineupSlot[],
  captainId: null as string | null,
  viceCaptainId: null as string | null,
};

export const useSquadStore = create<SquadState>((set, get) => ({
  ...initialState,

  setActiveSlot(position, index) {
    set({ activeSlot: position, activeSlotIndex: index });
  },

  clearActiveSlot() {
    set({ activeSlot: null, activeSlotIndex: null });
  },

  addPlayer(player) {
    const { selectedPlayers, formation, captainId, viceCaptainId, activeSlot } = get();
    if (!canAddPlayer(selectedPlayers, player, activeSlot).ok) {
      return;
    }
    const next = [...selectedPlayers, player];
    const lineup = recomputeLineup(next, formation, captainId, viceCaptainId);
    let nextCaptain = captainId;
    let nextVice = viceCaptainId;
    if (lineup.length === SQUAD_SIZE) {
      const cap = lineup.find((s) => s.isCaptain);
      const vice = lineup.find((s) => s.isViceCaptain);
      nextCaptain = cap?.playerId ?? null;
      nextVice = vice?.playerId ?? null;
    }
    set({
      selectedPlayers: next,
      lineup,
      captainId: nextCaptain,
      viceCaptainId: nextVice,
      activeSlot: null,
      activeSlotIndex: null,
    });
  },

  removePlayer(playerId) {
    const { selectedPlayers, formation } = get();
    const next = selectedPlayers.filter((p) => p.id !== playerId);
    const lineup = recomputeLineup(next, formation, null, null);
    set({
      selectedPlayers: next,
      lineup,
      captainId: null,
      viceCaptainId: null,
    });
  },

  setFormation(formation) {
    const { selectedPlayers, captainId, viceCaptainId } = get();
    const lineup = recomputeLineup(selectedPlayers, formation, captainId, viceCaptainId);
    let nextCaptain = captainId;
    let nextVice = viceCaptainId;
    if (lineup.length === SQUAD_SIZE) {
      const cap = lineup.find((s) => s.isCaptain);
      const vice = lineup.find((s) => s.isViceCaptain);
      nextCaptain = cap?.playerId ?? null;
      nextVice = vice?.playerId ?? null;
    }
    set({ formation, lineup, captainId: nextCaptain, viceCaptainId: nextVice });
  },

  setCaptain(playerId) {
    const { selectedPlayers, formation, viceCaptainId } = get();
    const lineup = recomputeLineup(selectedPlayers, formation, playerId, viceCaptainId);
    set({ captainId: playerId, lineup });
  },

  setViceCaptain(playerId) {
    const { selectedPlayers, formation, captainId } = get();
    const lineup = recomputeLineup(selectedPlayers, formation, captainId, playerId);
    set({ viceCaptainId: playerId, lineup });
  },

  cycleCaptainOnPlayer(playerId) {
    const { lineup, captainId, viceCaptainId, selectedPlayers, formation } = get();
    const slot = lineup.find((s) => s.playerId === playerId);
    if (!slot?.isStarter) {
      return;
    }

    let nextCaptain = captainId;
    let nextVice = viceCaptainId;

    if (playerId === captainId) {
      nextCaptain = null;
    } else if (playerId === viceCaptainId) {
      nextVice = null;
    } else if (!captainId) {
      nextCaptain = playerId;
    } else if (!viceCaptainId) {
      nextVice = playerId;
    } else {
      nextCaptain = playerId;
    }

    const nextLineup = recomputeLineup(selectedPlayers, formation, nextCaptain, nextVice);
    const cap = nextLineup.find((s) => s.isCaptain);
    const vice = nextLineup.find((s) => s.isViceCaptain);
    set({
      captainId: cap?.playerId ?? null,
      viceCaptainId: vice?.playerId ?? null,
      lineup: nextLineup,
    });
  },

  reset() {
    set(initialState);
  },

  isComplete() {
    return get().selectedPlayers.length === SQUAD_SIZE;
  },

  getErrors() {
    const { selectedPlayers, lineup } = get();
    return getValidationErrors(selectedPlayers, lineup);
  },

  getLineupForSubmit() {
    return get().lineup;
  },
}));
