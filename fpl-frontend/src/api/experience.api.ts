import { apiClient } from '@/api/client';
import type { AppNotification, BadgeConfig, LeaderboardResponse, PlayerProfile, ProfileStatistics } from '@/types/experience';

export async function getProfile(): Promise<PlayerProfile> {
  const { data } = await apiClient.get<PlayerProfile>('/api/profile');
  return data;
}

export async function updateProfile(input: Partial<Pick<PlayerProfile, 'displayName' | 'locale' | 'notificationPreferences'>> & { badgeConfig?: BadgeConfig }): Promise<PlayerProfile> {
  const { data } = await apiClient.patch<PlayerProfile>('/api/profile', input);
  return data;
}

export async function getProfileStatistics(): Promise<ProfileStatistics> {
  const { data } = await apiClient.get<ProfileStatistics>('/api/profile/statistics');
  return data;
}

export async function getLeaderboard(scope: 'gameweek' | 'overall'): Promise<LeaderboardResponse> {
  const { data } = await apiClient.get<LeaderboardResponse>('/api/leaderboard', { params: { scope } });
  return data;
}

export async function getNotifications(): Promise<{ data: AppNotification[]; unreadCount: number }> {
  const { data } = await apiClient.get<{ data: AppNotification[]; unreadCount: number }>('/api/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/api/notifications/${id}/read`);
}

