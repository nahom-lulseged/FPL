import type { TeamDetail } from '@/types/team';

export type ChipType = 'WILDCARD' | 'FREE_HIT' | 'BENCH_BOOST' | 'TRIPLE_CAPTAIN';
export type ChipTypeParam = 'wildcard' | 'free-hit' | 'bench-boost' | 'triple-captain';

export interface ChipHistoryItem {
  chipType: ChipType;
  gameweekNumber: number;
  wildcardNumber: number | null;
  usedAt: string;
}

export interface ChipStatus {
  targetGameweekNumber: number | null;
  activeThisGameweek: ChipType | null;
  availability: {
    WILDCARD: { '1': boolean; '2': boolean };
    FREE_HIT: boolean;
    BENCH_BOOST: boolean;
    TRIPLE_CAPTAIN: boolean;
  };
  history: ChipHistoryItem[];
}

export interface PlayChipResponse extends TeamDetail {
  chipPlayed: ChipHistoryItem;
}

export interface PlayWildcardInput {
  wildcardNumber: 1 | 2;
}
