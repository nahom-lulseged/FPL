import type { Position } from '@prisma/client';

export const SQUAD_SIZE = 15;
export const STARTING_XI_SIZE = 11;
export const BENCH_SIZE = 4;
export const BUDGET_TENTHS = 1000;
export const MAX_PLAYERS_PER_CLUB = 3;
export const MAX_FREE_TRANSFERS = 2;
export const TRANSFER_HIT_POINTS = 4;
export const TRIPLE_CAPTAIN_MULTIPLIER = 3;
export const WILDCARD_SECOND_HALF_START_GW = 20;
export const INVITE_CODE_LENGTH = 8;
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const POSITION_LIMITS: Record<Position, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

export interface Formation {
  def: number;
  mid: number;
  fwd: number;
}

export const VALID_FORMATIONS: Formation[] = [
  { def: 3, mid: 4, fwd: 3 },
  { def: 3, mid: 5, fwd: 2 },
  { def: 4, mid: 3, fwd: 3 },
  { def: 4, mid: 4, fwd: 2 },
  { def: 4, mid: 5, fwd: 1 },
  { def: 5, mid: 3, fwd: 2 },
  { def: 5, mid: 4, fwd: 1 },
  { def: 5, mid: 2, fwd: 3 },
];

export const DEFAULT_FORMATION: Formation = { def: 4, mid: 4, fwd: 2 };
