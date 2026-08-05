import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAnnouncement, deleteAnnouncement, listAnnouncements, listContactClaims, resolveContactClaim, sendNotification, updateAnnouncement } from '@/api/communications.api';

export const useAnnouncements = () => useQuery({ queryKey: ['admin', 'announcements'], queryFn: listAnnouncements });
export function useAnnouncementActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['admin', 'announcements'] });
  return {
    create: useMutation({ mutationFn: createAnnouncement, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateAnnouncement>[1] }) => updateAnnouncement(id, input), onSuccess: refresh }),
    remove: useMutation({ mutationFn: deleteAnnouncement, onSuccess: refresh }),
  };
}
export const useSendNotification = () => useMutation({ mutationFn: sendNotification });
export const useContactClaims = () => useQuery({ queryKey: ['admin', 'contact-claims'], queryFn: listContactClaims });
export function useResolveContactClaim() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, userId }: { id: string; userId: string }) => resolveContactClaim(id, userId), onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'contact-claims'] }) }); }
