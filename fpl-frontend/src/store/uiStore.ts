import { create } from 'zustand';

interface UiState {
  isMobileNavOpen: boolean;
  isUserMenuOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  setUserMenuOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  toggleUserMenu: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileNavOpen: false,
  isUserMenuOpen: false,

  setMobileNavOpen(open) {
    set({ isMobileNavOpen: open });
  },

  setUserMenuOpen(open) {
    set({ isUserMenuOpen: open });
  },

  toggleMobileNav() {
    set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen }));
  },

  toggleUserMenu() {
    set((state) => ({ isUserMenuOpen: !state.isUserMenuOpen }));
  },
}));
