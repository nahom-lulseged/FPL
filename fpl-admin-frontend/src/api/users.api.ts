import { apiClient } from '@/api/client';
import type {
  AdminUserDetail,
  AdminUserListParams,
  AdminUserSnapshot,
  AdminUsersListResponse,
} from '@/types/adminUser';

export async function getAdminUsers(
  params: AdminUserListParams = {},
): Promise<AdminUsersListResponse> {
  const { data } = await apiClient.get<AdminUsersListResponse>('/api/admin/users', {
    params: {
      ...params,
      ...(params.isAdmin !== undefined ? { isAdmin: String(params.isAdmin) } : {}),
      ...(params.hasTeam !== undefined ? { hasTeam: String(params.hasTeam) } : {}),
    },
  });
  return data;
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<AdminUserDetail>(`/api/admin/users/${id}`);
  return data;
}

export async function suspendAdminUser(
  id: string,
  body: { suspended: boolean; reason?: string },
): Promise<AdminUserSnapshot> {
  const { data } = await apiClient.patch<AdminUserSnapshot>(
    `/api/admin/users/${id}/suspend`,
    body,
  );
  return data;
}

export async function promoteAdminUser(id: string): Promise<AdminUserSnapshot> {
  const { data } = await apiClient.patch<AdminUserSnapshot>(`/api/admin/users/${id}/promote`, {
    confirm: true,
  });
  return data;
}

export async function resetAdminUserPassword(
  id: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    `/api/admin/users/${id}/reset-password`,
  );
  return data;
}

export async function deleteAdminUser(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/api/admin/users/${id}`, {
    data: { confirm: true },
  });
  return data;
}
