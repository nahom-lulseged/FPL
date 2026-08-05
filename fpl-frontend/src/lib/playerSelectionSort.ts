import { formatPrice } from '@/lib/formatters';
import type { PlayerListItem, PlayerSortField } from '@/types/player';

export interface SortOption {
  value: PlayerSortField;
  label: string;
}

export const PLAYER_SORT_OPTIONS: SortOption[] = [
  { value: 'totalPoints', label: 'Total points' },
  { value: 'eventPoints', label: 'Gameweek points' },
  { value: 'price', label: 'Price' },
  { value: 'selectedByPercent', label: 'Teams selected by %' },
  { value: 'minutes', label: 'Minutes played' },
  { value: 'goalsScored', label: 'Goals scored' },
  { value: 'assists', label: 'Assists' },
  { value: 'cleanSheets', label: 'Clean sheets' },
  { value: 'goalsConceded', label: 'Goals conceded' },
  { value: 'ownGoals', label: 'Own goals' },
  { value: 'penaltiesSaved', label: 'Penalties saved' },
];

const SORT_COLUMN_ABBREV: Record<PlayerSortField, string> = {
  totalPoints: 'TP',
  eventPoints: 'GW',
  price: '£',
  selectedByPercent: 'TSB%',
  minutes: 'Min',
  goalsScored: 'G',
  assists: 'A',
  cleanSheets: 'CS',
  goalsConceded: 'GC',
  ownGoals: 'OG',
  penaltiesSaved: 'PS',
};

export function getSortColumnLabel(sortBy: PlayerSortField): string {
  return PLAYER_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Stat';
}

export function getSortColumnAbbrev(sortBy: PlayerSortField): string {
  return SORT_COLUMN_ABBREV[sortBy] ?? 'Stat';
}

export function formatSortStatValue(player: PlayerListItem, sortBy: PlayerSortField): string {
  switch (sortBy) {
    case 'price':
      return formatPrice(player.price);
    case 'selectedByPercent':
      return `${(player.selectedByPercent ?? 0).toFixed(1)}%`;
    default: {
      const value = player[sortBy];
      if (value === null || value === undefined) {
        return '—';
      }
      return String(value);
    }
  }
}
