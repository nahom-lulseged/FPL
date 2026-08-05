export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface MeResponse {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  phoneE164?: string | null;
  contactSharedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  nextPath?: '/home' | '/squad-selection';
}

export interface RegisterResponse {
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}
