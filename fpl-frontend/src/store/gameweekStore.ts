import { create } from 'zustand';
import type { Gameweek } from '@/types/gameweek';

interface GameweekState {
  gameweeks: Gameweek[];
  currentGameweek: Gameweek | null;
  selectedGameweekNumber: number | null;
  setGameweeks: (gameweeks: Gameweek[]) => void;
  setCurrentGameweek: (gameweek: Gameweek) => void;
  setSelectedGameweekNumber: (number: number) => void;
}

export const useGameweekStore = create<GameweekState>((set) => ({
  gameweeks: [],
  currentGameweek: null,
  selectedGameweekNumber: null,

  setGameweeks(gameweeks) {
    set({ gameweeks });
  },

  setCurrentGameweek(gameweek) {
    set({
      currentGameweek: gameweek,
      selectedGameweekNumber: gameweek.number,
    });
  },

  setSelectedGameweekNumber(number) {
    set({ selectedGameweekNumber: number });
  },
}));
