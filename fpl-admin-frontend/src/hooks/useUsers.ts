import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminUser,
  getAdminUser,
  getAdminUsers,
  promoteAdminUser,
  resetAdminUserPassword,
  suspendAdminUser,
} from '@/api/users.api';
import type { AdminUserListParams } from '@/types/adminUser';

export function useUsersList(params: AdminUserListParams) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => getAdminUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useUserDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => getAdminUser(id!),
    enabled: Boolean(id),
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      suspended,
      reason,
    }: {
      id: string;
      suspended: boolean;
      reason?: string;
    }) => suspendAdminUser(id, { suspended, reason }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', variables.id] });
    },
  });
}

export function usePromoteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => promoteAdminUser(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users', id] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) => resetAdminUserPassword(id),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
