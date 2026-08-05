import { create } from 'zustand';
import * as adminAuthApi from '@/api/adminAuth.api';
import * as authApi from '@/api/auth.api';
import { adminTokenStorage } from '@/lib/tokenStorage';
import { isAdmin, type User } from '@/types/user';

const ADMIN_ACCESS_DENIED = 'This account does not have admin access';

interface AdminAuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  setTokens: (accessToken: string, refreshToken: string, user?: User | null) => void;
  hydrateFromStorage: () => Promise<void>;
}

function persistSession(accessToken: string, refreshToken: string, user: User): void {
  adminTokenStorage.setTokens(accessToken, refreshToken);
  adminTokenStorage.setUser(adminAuthApi.toStoredUser(user));
}

function finalizeLogin(
  set: (state: Partial<AdminAuthState>) => void,
  result: { user: User; accessToken: string; refreshToken: string },
) {
  if (!isAdmin(result.user)) {
    adminTokenStorage.clear();
    throw new Error(ADMIN_ACCESS_DENIED);
  }

  persistSession(result.accessToken, result.refreshToken, result.user);
  set({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    isAuthenticated: true,
  });
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,

  setTokens(accessToken, refreshToken, user = null) {
    adminTokenStorage.setAccessToken(accessToken);
    adminTokenStorage.setRefreshToken(refreshToken);
    if (user) {
      adminTokenStorage.setUser(adminAuthApi.toStoredUser(user));
    }
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: Boolean(user && isAdmin(user)),
    });
  },

  async login(email, password) {
    set({ isLoading: true });
    try {
      const result = await adminAuthApi.adminLogin({ email, password });
      finalizeLogin(set, result);
    } finally {
      set({ isLoading: false });
    }
  },

  clearSession() {
    adminTokenStorage.clear();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  async logout() {
    try {
      if (adminTokenStorage.getAccessToken()) {
        await authApi.logout();
      }
    } catch {
      // Clear local session even if logout request fails.
    } finally {
      get().clearSession();
    }
  },

  async hydrateFromStorage() {
    const accessToken = adminTokenStorage.getAccessToken();
    const refreshToken = adminTokenStorage.getRefreshToken();
    const storedUser = adminTokenStorage.getUser();

    if (!accessToken || !refreshToken || !storedUser) {
      adminTokenStorage.clear();
      set({ isHydrated: true, isAuthenticated: false });
      return;
    }

    if (!isAdmin(storedUser)) {
      adminTokenStorage.clear();
      set({ isHydrated: true, isAuthenticated: false });
      return;
    }

    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
      user: {
        id: storedUser.id,
        email: storedUser.email,
        displayName: storedUser.displayName,
        role: storedUser.role,
        createdAt: '',
        updatedAt: '',
      },
    });

    try {
      const me = await authApi.getMe();
      if (!isAdmin(me)) {
        throw new Error(ADMIN_ACCESS_DENIED);
      }
      adminTokenStorage.setUser(authApi.toStoredUser(me));
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
    } catch {
      get().clearSession();
    } finally {
      set({ isHydrated: true });
    }
  },
}));

export { ADMIN_ACCESS_DENIED };
