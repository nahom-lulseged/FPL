import type { ChipType } from '@/types/chip';
import type { Position } from '@/types/player';
import type { GameweekStatus } from '@/types/gameweek';

export interface Team {
  id: string;
  userId: string;
  name: string;
  season: string;
  bankBalance: number;
  squadValue: number;
  totalPoints: number;
  freeTransfers: number;
  createdAt: string;
  updatedAt: string;
}

export interface MyTeamRef {
  teamId: string;
  name: string;
  season: string;
}

export interface GameweekBreakdown {
  startersPoints: number;
  captainBonus: number;
  benchPoints: number;
  transferHit: number;
}

export type PointsStatus = 'pending' | 'provisional' | 'confirmed';

export interface SquadEntry {
  playerId: string;
  position: Position;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  player: {
    name: string;
    price: number;
    availabilityStatus?: string;
    chanceOfPlayingNextRound?: number | null;
    realTeam: {
      id: string;
      name: string;
      shortName: string;
    };
  };
  rawPoints: number | null;
  gameweekPoints: number | null;
  counted: boolean | null;
  captainMultiplier: number | null;
  wasSubstitutedIn: boolean | null;
  wasSubstitutedOut: boolean | null;
  pointsStatus: PointsStatus;
}

export interface TeamDetail {
  id: string;
  name: string;
  season: string;
  bankBalance: number;
  squadValue: number;
  totalPoints: number;
  freeTransfers: number;
  activeChip: ChipType | null;
  gameweek: {
    number: number;
    status: GameweekStatus;
  } | null;
  gameweekTotal: number | null;
  gameweekBreakdown: GameweekBreakdown | null;
  squad: SquadEntry[];
}

export interface CreateTeamLineupSlot {
  playerId: string;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface CreateTeamInput {
  name: string;
  season: string;
  playerIds: string[];
  lineup?: CreateTeamLineupSlot[];
}

export interface LineupSlotInput {
  playerId: string;
  isStarter: boolean;
  benchOrder: number | null;
}

export interface SetLineupInput {
  lineup: LineupSlotInput[];
  captainId?: string;
  viceCaptainId?: string;
  chipSelection?: 'BENCH_BOOST' | 'TRIPLE_CAPTAIN';
}

export interface SetCaptainInput {
  captainId: string;
  viceCaptainId: string;
}

export interface PlayerEventStats {
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  goalsConceded: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  bonus: number;
  bps: number;
  points: number;
  provisionalBonus: number | null;
}

export interface TeamGameweekPlayer {
  playerId: string;
  name: string;
  position: Position;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  rawPoints: number | null;
  counted: boolean | null;
  wasSubstitutedIn: boolean | null;
  wasSubstitutedOut: boolean | null;
  captainMultiplier: number | null;
  effectivePoints: number | null;
  eventStats: PlayerEventStats | null;
}

export interface TeamGameweekDetail {
  teamId: string;
  gameweek: {
    number: number;
    status: GameweekStatus;
  };
  startersPoints: number | null;
  captainBonus: number | null;
  benchPoints: number | null;
  transferHit: number | null;
  totalPoints: number | null;
  players: TeamGameweekPlayer[];
}
