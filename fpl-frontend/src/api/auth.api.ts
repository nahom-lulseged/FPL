import { apiClient } from '@/api/client';
import type {
  LoginResponse,
  MeResponse,
  RefreshResponse,
  User,
} from '@/types/user';

export type TelegramAuthStartResponse = LoginResponse & { status: 'authenticated' };

export async function startTelegramAuth(initData: string): Promise<TelegramAuthStartResponse> {
  const { data } = await apiClient.post<TelegramAuthStartResponse>('/api/auth/telegram/start', { initData });
  return data;
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/api/auth/refresh', { refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>('/api/me');
  return data;
}

export function toStoredUser(user: User | MeResponse): {
  id: string;
  email: string | null;
  displayName?: string;
  role?: User['role'];
} {
  return {
    id: user.id,
    email: user.email,
    displayName: 'displayName' in user ? user.displayName : undefined,
    role: 'role' in user ? user.role : undefined,
  };
}
