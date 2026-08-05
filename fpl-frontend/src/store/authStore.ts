import { create } from 'zustand';
import * as authApi from '@/api/auth.api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { tokenStorage } from '@/lib/tokenStorage';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  clearSession: () => void;
  setTokens: (accessToken: string, refreshToken: string, user?: User | null) => void;
  hydrateFromStorage: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,

  setTokens(accessToken, refreshToken, user = null) {
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setRefreshToken(refreshToken);
    if (user) {
      tokenStorage.setUser(authApi.toStoredUser(user));
    }
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    });
  },

  clearSession() {
    disconnectSocket();
    tokenStorage.clear();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  async logout() {
    try {
      await authApi.logout();
    } catch {
      // Clear local session even if logout request fails.
    } finally {
      get().clearSession();
    }
  },

  async fetchMe() {
    const me = await authApi.getMe();
    const stored = authApi.toStoredUser(me);
    tokenStorage.setUser(stored);
    set({
      user: {
        id: me.id,
        email: me.email,
        displayName: me.displayName,
        role: me.role,
        createdAt: me.createdAt,
        updatedAt: me.updatedAt,
      },
      isAuthenticated: true,
    });
  },

  async hydrateFromStorage() {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();
    const storedUser = tokenStorage.getUser();

    set({
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(storedUser),
      user: storedUser
        ? ({
            id: storedUser.id,
            email: storedUser.email,
            displayName: storedUser.displayName ?? '',
            role: storedUser.role ?? 'USER',
            createdAt: '',
            updatedAt: '',
          } as User)
        : null,
    });

    try {
      await get().fetchMe();
    } catch {
      get().clearSession();
    } finally {
      set({ isHydrated: true });
      if (get().isAuthenticated) {
        connectSocket();
      }
    }
  },
}));
