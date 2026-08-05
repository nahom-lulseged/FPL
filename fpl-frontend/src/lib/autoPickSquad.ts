import {
  BUDGET_TENTHS,
  getClubCounts,
  getPositionCounts,
  getRemainingBudget,
  MAX_PLAYERS_PER_CLUB,
  POSITION_LIMITS,
  SQUAD_SIZE,
} from '@/lib/fplRules';
import type { PlayerListItem, Position } from '@/types/player';

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function isValidCandidate(player: PlayerListItem): boolean {
  return Boolean(player.isAvailable && player.realTeam?.id);
}

function compareByRank(a: PlayerListItem, b: PlayerListItem): number {
  return (
    b.totalPoints - a.totalPoints ||
    b.price - a.price ||
    (b.selectedByPercent ?? 0) - (a.selectedByPercent ?? 0) ||
    a.name.localeCompare(b.name)
  );
}

function compareByCheapest(a: PlayerListItem, b: PlayerListItem): number {
  return a.price - b.price || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name);
}

/**
 * Minimum cost to fill remaining position quotas from unused players,
 * respecting club limits given the current selection.
 */
function minCostToFillRemaining(
  selected: PlayerListItem[],
  unused: PlayerListItem[],
): number {
  const needed: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const counts = getPositionCounts(selected);
  for (const position of POSITION_ORDER) {
    needed[position] = POSITION_LIMITS[position] - counts[position];
  }

  const totalNeeded = POSITION_ORDER.reduce((sum, position) => sum + needed[position], 0);
  if (totalNeeded === 0) {
    return 0;
  }

  const clubCounts = getClubCounts(selected);
  const usedIds = new Set(selected.map((player) => player.id));
  const pool = unused
    .filter((player) => isValidCandidate(player) && !usedIds.has(player.id))
    .sort(compareByCheapest);

  let cost = 0;
  let filled = 0;
  const workingClubs = new Map(clubCounts);
  const workingNeeded = { ...needed };

  for (const player of pool) {
    if (workingNeeded[player.position] <= 0) {
      continue;
    }
    const clubCount = workingClubs.get(player.realTeam.id) ?? 0;
    if (clubCount >= MAX_PLAYERS_PER_CLUB) {
      continue;
    }

    workingNeeded[player.position]--;
    workingClubs.set(player.realTeam.id, clubCount + 1);
    cost += player.price;
    filled++;

    if (filled === totalNeeded) {
      return cost;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function canAddWithReserve(
  selected: PlayerListItem[],
  player: PlayerListItem,
  allCandidates: PlayerListItem[],
): boolean {
  if (!isValidCandidate(player)) {
    return false;
  }
  if (selected.some((picked) => picked.id === player.id)) {
    return false;
  }

  const counts = getPositionCounts(selected);
  if (counts[player.position] >= POSITION_LIMITS[player.position]) {
    return false;
  }

  const clubCounts = getClubCounts(selected);
  const clubCount = clubCounts.get(player.realTeam.id) ?? 0;
  if (clubCount >= MAX_PLAYERS_PER_CLUB) {
    return false;
  }

  const spent = BUDGET_TENTHS - getRemainingBudget(selected);
  const nextSpent = spent + player.price;
  if (nextSpent > BUDGET_TENTHS) {
    return false;
  }

  const nextSelected = [...selected, player];
  const reserve = minCostToFillRemaining(nextSelected, allCandidates);
  return nextSpent + reserve <= BUDGET_TENTHS;
}

export function buildAutoPickSquad(candidates: PlayerListItem[]): PlayerListItem[] | null {
  return fillRemainingSlots([], candidates);
}

/**
 * Official-style greedy Auto Pick: lock existing picks, rank by points/price,
 * add premiums first while reserving budget for cheapest remaining fillers.
 */
export function fillRemainingSlots(
  existing: PlayerListItem[],
  candidates: PlayerListItem[],
): PlayerListItem[] | null {
  if (existing.length > SQUAD_SIZE) {
    return null;
  }

  if (existing.length === SQUAD_SIZE) {
    return getRemainingBudget(existing) >= 0 ? [...existing] : null;
  }

  const selected = [...existing];
  const lockedIds = new Set(existing.map((player) => player.id));
  const ranked = candidates
    .filter((player) => isValidCandidate(player) && !lockedIds.has(player.id))
    .sort(compareByRank);

  for (const player of ranked) {
    if (selected.length >= SQUAD_SIZE) {
      break;
    }
    if (!canAddWithReserve(selected, player, candidates)) {
      continue;
    }
    selected.push(player);
  }

  if (selected.length !== SQUAD_SIZE) {
    return null;
  }

  if (getRemainingBudget(selected) < 0) {
    return null;
  }

  const clubCounts = getClubCounts(selected);
  if ([...clubCounts.values()].some((count) => count > MAX_PLAYERS_PER_CLUB)) {
    return null;
  }

  const positionCounts = getPositionCounts(selected);
  if (POSITION_ORDER.some((position) => positionCounts[position] !== POSITION_LIMITS[position])) {
    return null;
  }

  return selected;
}

export function countAvailableByPosition(candidates: PlayerListItem[]): Record<Position, number> {
  return candidates.reduce(
    (acc, player) => {
      if (isValidCandidate(player)) {
        acc[player.position]++;
      }
      return acc;
    },
    { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<Position, number>,
  );
}

export function canBuildSquadFromPool(candidates: PlayerListItem[]): boolean {
  const counts = countAvailableByPosition(candidates);
  return POSITION_ORDER.every((position) => counts[position] >= POSITION_LIMITS[position]);
}
