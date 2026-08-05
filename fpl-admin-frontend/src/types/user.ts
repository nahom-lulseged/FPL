export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export function isAdmin(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type AdminLoginResponse = LoginResponse;

export interface RefreshResponse {
  accessToken: string;
}
