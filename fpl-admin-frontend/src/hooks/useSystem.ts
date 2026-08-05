import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createQueuesSession,
  getAlertConfigs,
  getSystemHealth,
  getSystemLogs,
  sendTestAlert,
  updateAlertConfigs,
} from '@/api/system.api';
import type { AlertConfigItem, SystemLogsParams } from '@/types/system';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: getSystemHealth,
    refetchInterval: 30_000,
  });
}

export function useSystemLogs(params: SystemLogsParams) {
  return useQuery({
    queryKey: ['admin', 'system', 'logs', params],
    queryFn: () => getSystemLogs(params),
  });
}

export function useAlertConfigs() {
  return useQuery({
    queryKey: ['admin', 'system', 'alerts'],
    queryFn: async () => {
      const result = await getAlertConfigs();
      return result.configs;
    },
  });
}

export function useUpdateAlertConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configs: AlertConfigItem[]) => updateAlertConfigs(configs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'alerts'] });
    },
  });
}

export function useCreateQueuesSession() {
  return useMutation({
    mutationFn: createQueuesSession,
  });
}

export function useSendTestAlert() {
  return useMutation({
    mutationFn: sendTestAlert,
  });
}
