import { apiClient } from '@/api/client';
import type { DashboardOverview, DashboardSummary } from '@/types/dashboard';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/api/admin/dashboard/summary');
  return data;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { data } = await apiClient.get<DashboardOverview>('/api/admin/dashboard/overview');
  return data;
}
