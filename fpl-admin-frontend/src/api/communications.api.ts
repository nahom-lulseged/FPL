import { apiClient } from '@/api/client';

export type NotificationType = 'DEADLINE' | 'WALLET' | 'LEAGUE' | 'WINNER' | 'SYSTEM';
export interface Announcement { id: string; title: string; message: string; actionUrl?: string | null; publishedAt: string; expiresAt?: string | null; createdAt?: string }
export interface AnnouncementInput { title: string; message: string; actionUrl?: string; publishedAt?: string; expiresAt?: string }
export interface ContactClaim { id: string; telegramId: string; telegramUsername?: string | null; displayName: string; phoneE164: string; supportNote: string; createdAt: string }

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<{ data: Announcement[] }>('/api/admin/content/announcements');
  return data.data;
}
export async function createAnnouncement(input: AnnouncementInput) { return (await apiClient.post<Announcement>('/api/admin/content/announcements', input)).data; }
export async function updateAnnouncement(id: string, input: Partial<AnnouncementInput>) { return (await apiClient.patch<Announcement>(`/api/admin/content/announcements/${id}`, input)).data; }
export async function deleteAnnouncement(id: string) { await apiClient.delete(`/api/admin/content/announcements/${id}`); }
export async function sendNotification(input: { userId?: string; type: NotificationType; title: string; message: string; actionUrl?: string }) {
  return (await apiClient.post<{ delivered: number }>('/api/admin/content/notifications', input)).data;
}
export async function listContactClaims(): Promise<ContactClaim[]> { return (await apiClient.get<{ data: ContactClaim[] }>('/api/admin/support/telegram-contact-claims')).data.data; }
export async function resolveContactClaim(id: string, userId: string) { return (await apiClient.post(`/api/admin/support/telegram-contact-claims/${id}/resolve`, { userId })).data; }
