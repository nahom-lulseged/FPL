import type { ChipType, ChipTypeParam } from '@/types/chip';

export const WILDCARD_SECOND_HALF_START_GW = 20;

export function isUnlimitedTransferChip(chip: ChipType | null | undefined): boolean {
  return chip === 'WILDCARD' || chip === 'FREE_HIT';
}

export interface ChipMeta {
  label: string;
  shortDescription: string;
  confirmDescription: string;
  accentClass: string;
  borderClass: string;
  bgClass: string;
}

export const CHIP_META: Record<ChipType, ChipMeta> = {
  WILDCARD: {
    label: 'Wildcard',
    shortDescription: 'Unlimited free transfers',
    confirmDescription:
      'Make unlimited free transfers with no point hits. Your free transfers reset to 1 next gameweek.',
    accentClass: 'text-fpl-gold',
    borderClass: 'border-fpl-gold/50',
    bgClass: 'bg-fpl-purple-700',
  },
  FREE_HIT: {
    label: 'Free Hit',
    shortDescription: 'One-week squad overhaul',
    confirmDescription:
      'Make unlimited free transfers this gameweek. Your squad will revert to its current state next gameweek.',
    accentClass: 'text-fpl-cyan',
    borderClass: 'border-fpl-cyan/50',
    bgClass: 'bg-fpl-cyan/10',
  },
  BENCH_BOOST: {
    label: 'Bench Boost',
    shortDescription: 'Bench players score too',
    confirmDescription:
      'Bench players who do not get auto-subbed in will also score points this gameweek.',
    accentClass: 'text-fpl-green',
    borderClass: 'border-fpl-green/50',
    bgClass: 'bg-fpl-green/10',
  },
  TRIPLE_CAPTAIN: {
    label: 'Triple Captain',
    shortDescription: 'Captain scores 3×',
    confirmDescription: 'Your captain will score triple points instead of double this gameweek.',
    accentClass: 'text-fpl-pink',
    borderClass: 'border-fpl-pink/50',
    bgClass: 'bg-fpl-pink/10',
  },
};

const CHIP_TYPE_TO_PARAM: Record<ChipType, ChipTypeParam> = {
  WILDCARD: 'wildcard',
  FREE_HIT: 'free-hit',
  BENCH_BOOST: 'bench-boost',
  TRIPLE_CAPTAIN: 'triple-captain',
};

export function chipTypeToParam(chipType: ChipType): ChipTypeParam {
  return CHIP_TYPE_TO_PARAM[chipType];
}

export function formatChipLabel(chipType: ChipType, wildcardNumber?: number | null): string {
  if (chipType === 'WILDCARD' && wildcardNumber) {
    return `Wildcard ${wildcardNumber}`;
  }
  return CHIP_META[chipType].label;
}

export function getChipBannerMessage(chipType: ChipType): string {
  switch (chipType) {
    case 'WILDCARD':
      return 'Wildcard active — unlimited free transfers, no point hits';
    case 'FREE_HIT':
      return 'Free Hit active — unlimited transfers; squad reverts next gameweek';
    case 'BENCH_BOOST':
      return 'Bench Boost active — bench players who did not auto-sub in also score';
    case 'TRIPLE_CAPTAIN':
      return 'Triple Captain active — captain scores 3× points';
  }
}
