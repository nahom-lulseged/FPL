import type { Position } from '@prisma/client';

export interface PlayerGwInput {
  playerId: string;
  position: Position;
  minutes: number;
  points: number;
}

export interface SnapshotSlot {
  playerId: string;
  position: Position;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface PlayerScoreBreakdown {
  playerId: string;
  rawPoints: number;
  counted: boolean;
  wasSubstitutedIn: boolean;
  wasSubstitutedOut: boolean;
  captainMultiplier: 1 | 2 | 3;
  effectivePoints: number;
}

export interface EffectiveLineup {
  effectivePlayerIds: string[];
  substitutedIn: Set<string>;
  substitutedOut: Set<string>;
}

export interface TeamGameweekResult {
  startersPoints: number;
  captainBonus: number;
  benchPoints: number;
  transferHit: number;
  totalPoints: number;
  players: PlayerScoreBreakdown[];
}

export interface CaptainResolution {
  effectiveCaptainId: string | null;
  multiplierByPlayerId: Map<string, 1 | 2 | 3>;
}

export interface ChipScoringOptions {
  benchBoost?: boolean;
  tripleCaptain?: boolean;
}

export type CaptainMultiplier = 1 | 2 | 3;

export interface TeamScoreDiff {
  teamId: string;
  teamName: string;
  oldPoints: number;
  newPoints: number;
  delta: number;
}

export interface GameweekComputeResult {
  gameweekId: string;
  gameweekNumber: number;
  diffs: TeamScoreDiff[];
  teamsScored: number;
  skipped: number;
}
