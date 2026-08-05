import type { Position } from '@prisma/client';

export interface SquadPlayerInput {
  playerId: string;
  position: Position;
  price: number;
  realTeamId: string;
  isAvailable: boolean;
}

export interface LineupSlot {
  playerId: string;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
