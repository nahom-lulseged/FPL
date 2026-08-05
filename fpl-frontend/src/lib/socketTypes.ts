export interface GwStatsUpdatedPayload {
  gameweekNumber: number;
  updatedPlayerIds: string[];
}

export interface TeamScoreUpdatedPayload {
  teamId: string;
  gameweekNumber: number;
  totalPoints: number;
  pointsStatus: 'provisional' | 'confirmed';
}

export interface PlayerPriceChangedPayload {
  playerId: string;
  oldPrice: number;
  newPrice: number;
}

export interface DeadlineReminderPayload {
  gameweekNumber: number;
  deadline: string;
  minutesUntil: number;
}

export interface GwFinalizedPayload {
  gameweekNumber: number;
}

export interface StandingsUpdatedPayload {
  leagueId: string;
}
