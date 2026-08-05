const USER_KEY = 'fpl_user';
let accessToken: string | null = null;
let refreshToken: string | null = null;

export interface StoredUser {
  id: string;
  email: string | null;
  displayName?: string;
  role?: 'USER' | 'ADMIN';
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    return refreshToken;
  },

  getUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },

  setAccessToken(token: string): void {
    accessToken = token;
  },

  setRefreshToken(token: string): void {
    refreshToken = token;
  },

  setUser(user: StoredUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  },

  clear(): void {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem(USER_KEY);
  },
};
