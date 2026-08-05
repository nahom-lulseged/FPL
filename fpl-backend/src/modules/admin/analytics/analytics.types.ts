import type { ChipType } from '@prisma/client';

export interface TransferTrendPlayer {
  playerId: string;
  playerName: string;
  count: number;
}

export interface TransferTrendsResponse {
  gameweek: { id: string; number: number };
  transferredIn: TransferTrendPlayer[];
  transferredOut: TransferTrendPlayer[];
}

export interface ChipUsageByGameweek {
  chipType: ChipType;
  gameweekNumber: number;
  count: number;
}

export interface ChipUsageResponse {
  byType: Record<ChipType, number>;
  byGameweek: ChipUsageByGameweek[];
}

export interface GrowthBucket {
  period: string;
  registrations: number;
  teamsCreated: number;
}

export interface GrowthResponse {
  from: string;
  to: string;
  granularity: 'day' | 'week';
  buckets: GrowthBucket[];
}

export type ExportEntity = 'users' | 'players' | 'leagues';
