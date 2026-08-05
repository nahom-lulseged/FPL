import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  isUserMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  toggleUserMenu: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

function initialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage?.getItem('fpl-admin-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  isMobileNavOpen: false,

  setMobileNavOpen(open) {
    set((state) => ({
      isMobileNavOpen: open,
      isUserMenuOpen: open ? false : state.isUserMenuOpen,
    }));
  },

  toggleMobileNav() {
    set((state) => ({
      isMobileNavOpen: !state.isMobileNavOpen,
      isUserMenuOpen: false,
    }));
  },

  isUserMenuOpen: false,

  setUserMenuOpen(open) {
    set({ isUserMenuOpen: open });
  },

  toggleUserMenu() {
    set((state) => ({ isUserMenuOpen: !state.isUserMenuOpen }));
  },

  theme: initialTheme(),
  toggleTheme() {
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage?.setItem('fpl-admin-theme', theme);
      } catch {
        // Theme still applies for this session when storage is unavailable.
      }
      document.documentElement.dataset.theme = theme;
      return { theme };
    });
  },
}));
