import { useQuery } from '@tanstack/react-query';
import { listPlayers } from '@/api/players.api';
import type { PlayerListItem, Position } from '@/types/player';

export interface PlayerPositionRanks {
  total: number;
  price: number;
  pointsPerMatch: number;
  form: number;
  selected: number;
}

function pointsPerMatch(player: PlayerListItem) {
  return player.totalPoints / Math.max(1, Math.ceil(player.minutes / 90));
}

function rankOf(players: PlayerListItem[], playerId: string, value: (player: PlayerListItem) => number) {
  return [...players]
    .sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name))
    .findIndex((player) => player.id === playerId) + 1;
}

async function fetchPositionPlayers(position: Position) {
  const first = await listPlayers({ position, page: 1, limit: 100 });
  const players = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    const next = await listPlayers({ position, page, limit: 100 });
    players.push(...next.data);
  }
  return players;
}

export function usePositionPlayerRanks(position: Position | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: ['positionPlayerRanks', position],
    queryFn: () => fetchPositionPlayers(position!),
    enabled: Boolean(position && playerId),
    staleTime: 5 * 60 * 1000,
    select: (players): PlayerPositionRanks => ({
      total: players.length,
      price: rankOf(players, playerId!, (player) => player.price),
      pointsPerMatch: rankOf(players, playerId!, pointsPerMatch),
      form: rankOf(players, playerId!, (player) => player.eventPoints),
      selected: rankOf(players, playerId!, (player) => player.selectedByPercent),
    }),
  });
}
