import type { Server } from 'socket.io';

export const SOCKET_EVENTS = {
  GW_STATS_UPDATED: 'gw:stats:updated',
  TEAM_SCORE_UPDATED: 'team:score:updated',
  PLAYER_PRICE_CHANGED: 'player:price:changed',
  DEADLINE_REMINDER: 'deadline:reminder',
  GW_FINALIZED: 'gw:finalized',
  STANDINGS_UPDATED: 'standings:updated',
} as const;

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

let gateway: LiveScoresGateway | null = null;

export class LiveScoresGateway {
  constructor(private readonly io: Server) {}

  emitGwStatsUpdated(payload: GwStatsUpdatedPayload): void {
    this.io.to(`gw:${payload.gameweekNumber}`).emit(SOCKET_EVENTS.GW_STATS_UPDATED, payload);
  }

  emitTeamScoreUpdated(payload: TeamScoreUpdatedPayload): void {
    this.io.to(`team:${payload.teamId}`).emit(SOCKET_EVENTS.TEAM_SCORE_UPDATED, payload);
  }

  emitPlayerPriceChanged(payload: PlayerPriceChangedPayload): void {
    this.io.emit(SOCKET_EVENTS.PLAYER_PRICE_CHANGED, payload);
  }

  emitDeadlineReminder(payload: DeadlineReminderPayload): void {
    this.io
      .to(`gw:${payload.gameweekNumber}`)
      .emit(SOCKET_EVENTS.DEADLINE_REMINDER, payload);
    this.io.emit(SOCKET_EVENTS.DEADLINE_REMINDER, payload);
  }

  emitGwFinalized(payload: GwFinalizedPayload): void {
    this.io.to(`gw:${payload.gameweekNumber}`).emit(SOCKET_EVENTS.GW_FINALIZED, payload);
    this.io.emit(SOCKET_EVENTS.GW_FINALIZED, payload);
  }

  emitStandingsUpdated(payload: StandingsUpdatedPayload): void {
    this.io.to(`league:${payload.leagueId}`).emit(SOCKET_EVENTS.STANDINGS_UPDATED, payload);
  }
}

export function initLiveScoresGateway(io: Server): LiveScoresGateway {
  gateway = new LiveScoresGateway(io);
  return gateway;
}

export function getLiveScoresGateway(): LiveScoresGateway | null {
  return gateway;
}
