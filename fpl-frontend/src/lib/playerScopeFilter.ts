import type { Position } from '@/types/player';

export type TeamFilterValue = 'all' | 'watchlist' | `pos-${Position}` | `club-${string}`;

const POSITION_FILTER_LABEL: Record<Position, string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

export interface RealTeamOption {
  id: string;
  name: string;
  shortName: string;
}

export function getScopeFilterTriggerLabel(
  value: TeamFilterValue,
  teams: RealTeamOption[],
): string {
  if (value === 'all') {
    return 'All players';
  }
  if (value === 'watchlist') {
    return 'Watchlist';
  }
  if (value.startsWith('pos-')) {
    const pos = value.slice(4) as Position;
    return POSITION_FILTER_LABEL[pos] ?? value;
  }
  if (value.startsWith('club-')) {
    const id = value.slice(5);
    const team = teams.find((t) => t.id === id);
    return team?.shortName ?? team?.name ?? 'Club';
  }
  return 'All players';
}

export { POSITION_FILTER_LABEL };
