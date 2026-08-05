export const queryKeys = {
  leagueStandings: (leagueId: string | undefined) => ['leagueStandings', leagueId] as const,
  team: (teamId: string | undefined) => ['team', teamId] as const,
  players: (filters: Record<string, unknown>) => ['players', filters] as const,
} as const;
