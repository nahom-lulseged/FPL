import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTeam, setCaptain, setLineup } from '@/api/teams.api';
import { CURRENT_SEASON } from '@/lib/config';
import type { CreateTeamInput, SetCaptainInput, SetLineupInput } from '@/types/team';

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTeamInput) => createTeam(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTeamRef', CURRENT_SEASON] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function useSetCaptain(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetCaptainInput) => setCaptain(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['chipStatus', teamId] });
    },
  });
}

export function useSetLineup(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetLineupInput) => setLineup(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['chipStatus', teamId] });
    },
  });
}
