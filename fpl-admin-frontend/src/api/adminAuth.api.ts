import { apiClient } from '@/api/client';
import type { AdminLoginResponse, User } from '@/types/user';

export interface AdminLoginInput {
  email: string;
  password: string;
}

export async function adminLogin(input: AdminLoginInput): Promise<AdminLoginResponse> {
  const { data } = await apiClient.post<AdminLoginResponse>('/api/admin/auth/login', input);
  return data;
}

export function toStoredUser(user: User): {
  id: string;
  email: string;
  displayName: string;
  role: User['role'];
} {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
