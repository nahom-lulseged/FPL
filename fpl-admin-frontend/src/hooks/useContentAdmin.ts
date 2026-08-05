import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminPlayer,
  listAdminFixtures,
  listAdminGameweeks,
  listAdminPlayers,
  listAdminRealTeams,
  syncAdminPlayerSummary,
  updateAdminFixture,
  updateAdminGameweek,
  updateAdminPlayer,
  updateAdminRealTeam,
} from '@/api/content.api';
import type {
  UpdateFixtureBody,
  UpdateGameweekBody,
  UpdatePlayerBody,
  UpdateRealTeamBody,
} from '@/types/content';

export function useAdminPlayers(params: {
  page: number;
  limit?: number;
  search?: string;
  position?: string;
  teamId?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'content', 'players', params],
    queryFn: () => listAdminPlayers(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminPlayerDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'content', 'players', 'detail', id],
    queryFn: () => getAdminPlayer(id!),
    enabled: Boolean(id),
  });
}

export function useSyncAdminPlayerSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => syncAdminPlayerSummary(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'players'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'players', 'detail', id] }),
      ]);
    },
  });
}

export function useUpdateAdminPlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlayerBody }) =>
      updateAdminPlayer(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'players'] });
    },
  });
}

export function useAdminRealTeams(params: { page: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'content', 'real-teams', params],
    queryFn: () => listAdminRealTeams(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminRealTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRealTeamBody }) =>
      updateAdminRealTeam(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'real-teams'] });
    },
  });
}

export function useAdminFixtures(params: {
  page: number;
  limit?: number;
  gameweek?: number;
  teamId?: string;
  isPostponed?: boolean;
}) {
  return useQuery({
    queryKey: ['admin', 'content', 'fixtures', params],
    queryFn: () => listAdminFixtures(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminFixture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFixtureBody }) =>
      updateAdminFixture(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'fixtures'] });
    },
  });
}

export function useAdminGameweeks(params: { page: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'content', 'gameweeks', params],
    queryFn: () => listAdminGameweeks(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminGameweek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGameweekBody }) =>
      updateAdminGameweek(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'gameweeks'] });
    },
  });
}
